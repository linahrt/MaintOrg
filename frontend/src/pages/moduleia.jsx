import { useState, useEffect, useCallback, useRef } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");
const AI_API_URL = "http://127.0.0.1:8000";

// ──────────────────────────────────────────────
// CACHE HELPERS (cache frontend – indépendant du cache backend)
// ──────────────────────────────────────────────
const CACHE_KEY = "maintorg_ia_cache";
const CACHE_TTL_MS = Infinity; // refresh manuel uniquement

function saveCache(data) {
  try {
    localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (e) {
    console.warn("Cache save failed:", e);
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    return { timestamp, data };
  } catch {
    return null;
  }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

function formatCacheAge(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

// ──────────────────────────────────────────────
// HELPERS & FORMATTING
// ──────────────────────────────────────────────
const formatPercent = (val) => `${Math.round((val || 0) * 100)}%`;
const formatHours = (val) => (val > 0 ? `${val.toFixed(1)}h` : "N/A");
const formatDate = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

// Label lisible pour la méthode de prédiction (correspond aux valeurs du backend)
const METHOD_LABELS = {
  random_forest: "🧠 Random Forest",
  logistic: "🧠 Régression Logistique",
  score_heuristique: "📊 Score heuristique",
  score_heuristique_fallback: "📊 Score heuristique (repli)",
};

const RiskLevelBadge = ({ level }) => {
  const cfg = {
    CRITIQUE: "bg-red-600 text-white",
    ÉLEVÉ: "bg-orange-500 text-white",
    MODÉRÉ: "bg-amber-400 text-white",
    FAIBLE: "bg-green-500 text-white",
  };
  return (
      <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
              cfg[level] || "bg-gray-200 text-gray-700"
          }`}
      >
      {level}
    </span>
  );
};

const ProbaBar = ({ value, method }) => {
  const color =
      value >= 0.7
          ? "bg-red-500"
          : value >= 0.45
              ? "bg-amber-500"
              : value >= 0.25
                  ? "bg-blue-400"
                  : "bg-green-400";
  return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Probabilité de panne (30j)</span>
          <span className="font-semibold text-slate-800">{formatPercent(value)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
              className={`h-2 rounded-full ${color} transition-all duration-500`}
              style={{ width: `${(value || 0) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 block">
        {METHOD_LABELS[method] || "📊 Score heuristique"}
      </span>
      </div>
  );
};

// ──────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────
const SearchIcon = () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const RefreshIcon = ({ spinning }) => (
    <svg className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
);
const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const BrainIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4z" />
      <circle cx="9" cy="9" r="1" /><circle cx="15" cy="9" r="1" /><path d="M9 14h6" />
    </svg>
);
const AlertTriangleIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const CheckCircleIcon = () => (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
const ChevronRightIcon = ({ expanded }) => (
    <svg
        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
);
const ClockIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const ChartIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
);

// ──────────────────────────────────────────────
// MAIN COMPONENT: Module IA
// ──────────────────────────────────────────────
export default function ModuleIA() {
  const [equipements, setEquipements] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [reportUrl, setReportUrl] = useState("");
  const [equipementsList, setEquipementsList] = useState([]);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [modelInfo, setModelInfo] = useState(null); // métriques du modèle ML

  // ── Charger les métriques du modèle ML ──────
  const fetchModelMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${AI_API_URL}/api/model/metrics`);
      if (res.ok) {
        const data = await res.json();
        setModelInfo(data);
      }
    } catch (e) {
      console.warn("Impossible de charger les métriques du modèle", e);
    }
  }, []);

  // ── Appliquer les données d'analyse ────────
  const applyData = useCallback((analyse) => {
    setAiData(analyse);
    setEquipements(analyse?.equipements || []);
  }, []);

  // ── Liste des équipements (pour filtre) ────
  const fetchEquipementsList = useCallback(async () => {
    try {
      const list = await pb.collection("equipements").getFullList({ sort: "nom" });
      setEquipementsList(list);
    } catch (e) {
      console.warn("Impossible de charger les équipements", e);
    }
  }, []);

  // ── Analyse complète (force = ignore cache) ──
  const runAnalysis = useCallback(
      async (equipementId = null, format = "json", forceRefresh = false) => {
        setAnalyzing(true);
        setError("");
        try {
          const response = await fetch(`${AI_API_URL}/api/analyse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              equipement_id: equipementId,
              output_format: format,
              use_cache: !forceRefresh, // ← contrôle le cache backend
            }),
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Erreur API ${response.status}: ${errText}`);
          }
          const result = await response.json();

          if (format === "json") {
            if (equipementId) {
              // Re-analyse unitaire : on met à jour un seul équipement dans la liste
              const updatedEq = result.analyse?.equipements?.[0];
              if (updatedEq) {
                setEquipements((prev) =>
                    prev.map((eq) => (eq.id === equipementId ? { ...eq, ...updatedEq } : eq))
                );
              }
            } else {
              // Analyse globale : on remplace tout
              applyData(result.analyse);
              saveCache(result.analyse);
              setCacheTimestamp(Date.now());
              setFromCache(false);
            }
            // Rafraîchir les métriques du modèle après chaque analyse
            fetchModelMetrics();
          } else if (result.rapport_path) {
            const filename = result.rapport_path.split("/").pop();
            setReportUrl(`${AI_API_URL}/api/rapport/${filename}`);
          }
        } catch (e) {
          setError("Erreur lors de l'analyse IA : " + e.message);
          console.error(e);
        } finally {
          setAnalyzing(false);
          setLoading(false);
        }
      },
      [applyData, fetchModelMetrics]
  );

  // ── Dashboard : cache frontend en priorité ──
  const fetchDashboard = useCallback(
      async (forceRefresh = false) => {
        if (!forceRefresh) {
          const cached = loadCache();
          if (cached) {
            applyData(cached.data);
            setCacheTimestamp(cached.timestamp);
            setFromCache(true);
            setLoading(false);
            fetchModelMetrics();
            return;
          }
        }

        setLoading(true);
        setFromCache(false);
        try {
          // On appelle directement /api/analyse pour avoir la liste complète
          // (le backend /api/dashboard ne retourne que top5 + critiques)
          await runAnalysis(null, "json", true);
        } catch (e) {
          setError("Impossible de charger le dashboard IA");
          console.error(e);
        } finally {
          setLoading(false);
        }
      },
      [applyData, runAnalysis, fetchModelMetrics]
  );

  // ── Refresh manuel ─────────────────────────
  const handleManualRefresh = useCallback(() => {
    clearCache();
    setReportUrl("");
    fetchDashboard(true);
  }, [fetchDashboard]);

  // ── Nouvelle analyse ───────────────────────
  const handleNewAnalysis = useCallback(() => {
    clearCache();
    setReportUrl("");
    runAnalysis(null, "json", true);
  }, [runAnalysis]);

  // ── Mount ──────────────────────────────────
  useEffect(() => {
    fetchEquipementsList();
    fetchModelMetrics();
    fetchDashboard(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtres ────────────────────────────────
  const filteredEquipements = (aiData?.equipements || equipements).filter((eq) => {
    const matchSearch =
        !search ||
        eq.nom?.toLowerCase().includes(search.toLowerCase()) ||
        eq.zone?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = !filterRisk || eq.niveau_risque === filterRisk;
    return matchSearch && matchRisk;
  });

  const stats = aiData?.stats_globales || aiData?.stats || {};
  const critiques = filteredEquipements.filter((e) => e.niveau_risque === "CRITIQUE");
  const eleves = filteredEquipements.filter((e) => e.niveau_risque === "ÉLEVÉ");

  // Label du modèle actif pour l'affichage
  const modelTypeLabel = {
    random_forest: "Random Forest",
    logistic: "Régression Logistique",
  }[modelInfo?.type_modele] || "Score heuristique";

  return (
      <div className="p-4 bg-gray-50 min-h-screen font-sans rounded-2xl">
        {/* ── Header ──────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <BrainIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Module IA – Analyse Prédictive</h1>
              <p className="text-sm text-gray-500">
                Prédiction des pannes · {modelInfo?.disponible ? modelTypeLabel : "Score heuristique"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fromCache && cacheTimestamp && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg">
                  <ClockIcon />
                  <span>Cache – {formatCacheAge(cacheTimestamp)}</span>
                </div>
            )}

            <button
                onClick={handleNewAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                title="Relancer l'analyse et mettre à jour le cache"
            >
              <BrainIcon /> Nouvelle analyse
            </button>

            <button
                onClick={() => runAnalysis(null, "docx", true)}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <DownloadIcon /> Exporter rapport
            </button>

            <button
                onClick={handleManualRefresh}
                disabled={analyzing}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                title="Rafraîchir les données (efface le cache)"
            >
              <RefreshIcon spinning={analyzing} />
            </button>
          </div>
        </div>

        {/* ── Error Banner ────────────────────── */}
        {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangleIcon /> {error}
            </div>
        )}

        {/* ── Report Download Banner ──────────── */}
        {reportUrl && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
              <span>✅ Rapport généré avec succès !</span>
              <a href={reportUrl} download className="font-semibold underline hover:text-green-900">
                Télécharger le fichier .docx
              </a>
            </div>
        )}

        {/* ── Stats Cards ─────────────────────── */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-300 animate-pulse h-28" />
              ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-sm">
                <div className="text-3xl font-bold text-slate-800">{stats.nb_equipements || 0}</div>
                <div className="text-sm text-gray-500">Équipements analysés</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-sm">
                <div className="text-3xl font-bold text-red-600">{critiques.length}</div>
                <div className="text-sm text-gray-500">Risques critiques</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-sm">
                <div className="text-3xl font-bold text-amber-600">{eleves.length}</div>
                <div className="text-sm text-gray-500">Risques élevés</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-sm">
                <div className="text-3xl font-bold text-indigo-600">
                  {stats.taux_maintenance_preventive || 0}%
                </div>
                <div className="text-sm text-gray-500">Maintenance préventive</div>
              </div>
            </div>
        )}

        {/* ── Filters & Search ────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 w-64">
            <SearchIcon />
            <input
                type="text"
                placeholder="Rechercher un équipement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="outline-none text-sm text-gray-700 bg-transparent w-full placeholder-gray-400"
            />
          </div>
          <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Tous les niveaux de risque</option>
            <option value="CRITIQUE">🔴 Critique</option>
            <option value="ÉLEVÉ">🟠 Élevé</option>
            <option value="MODÉRÉ">🟡 Modéré</option>
            <option value="FAIBLE">🟢 Faible</option>
          </select>
          <button
              onClick={() => {
                setSearch("");
                setFilterRisk("");
              }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Réinitialiser
          </button>
        </div>

        {/* ── Equipment List ──────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Analyse par équipement</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {filteredEquipements.length} résultats
          </span>
          </div>

          {analyzing ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                <p>Analyse en cours…</p>
              </div>
          ) : filteredEquipements.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">
                Aucun équipement ne correspond aux filtres.
              </div>
          ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredEquipements.map((eq) => (
                    <div key={eq.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                              onClick={() => setExpandedId(expandedId === eq.id ? null : eq.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronRightIcon expanded={expandedId === eq.id} />
                          </button>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{eq.nom}</div>
                            <div className="text-xs text-gray-500">{eq.zone || "Zone non définie"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <RiskLevelBadge level={eq.niveau_risque} />
                          <div className="w-40">
                            <ProbaBar
                                value={eq.proba_panne_30j || 0}
                                method={eq.methode_prediction}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {expandedId === eq.id && (
                          <div className="mt-4 pl-9 border-l-2 border-indigo-200 ml-3 space-y-4">
                            {/* KPI Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">MTTR</span>
                                <p className="text-slate-700 mt-1 font-medium">{formatHours(eq.mttr_h)}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">MTBF</span>
                                <p className="text-slate-700 mt-1 font-medium">{formatHours(eq.mtbf_h)}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Pannes (30j)</span>
                                <p className="text-slate-700 mt-1 font-medium">{eq.pannes_30j || 0}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Dernière panne</span>
                                <p className="text-slate-700 mt-1 font-medium">
                                  {eq.days_since_last_failure !== null && eq.days_since_last_failure !== undefined
                                      ? `Il y a ${eq.days_since_last_failure}j`
                                      : "Jamais"}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Tendance</span>
                                <p className="text-slate-700 mt-1 font-medium">
                                  {eq.tendance_pannes ? `${eq.tendance_pannes}x` : "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">OT en retard</span>
                                <p className="text-slate-700 mt-1 font-medium">{eq.nb_ot_en_retard || 0}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Stock faible</span>
                                <p className="text-slate-700 mt-1 font-medium">{eq.stock_faible || 0}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Plans préventifs</span>
                                <p className="text-slate-700 mt-1 font-medium">{eq.nb_plans_actifs || 0}</p>
                              </div>
                            </div>

                            {/* Score breakdown */}
                            <div className="bg-slate-50 rounded-lg p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Score de risque</span>
                                <span className="font-bold text-slate-800">
                          {((eq.score_risque || 0) * 100).toFixed(1)}%
                        </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${
                                        (eq.score_risque || 0) >= 0.7
                                            ? "bg-red-500"
                                            : (eq.score_risque || 0) >= 0.45
                                                ? "bg-orange-500"
                                                : (eq.score_risque || 0) >= 0.25
                                                    ? "bg-amber-400"
                                                    : "bg-green-500"
                                    }`}
                                    style={{ width: `${(eq.score_risque || 0) * 100}%` }}
                                />
                              </div>
                            </div>

                            {/* Recommendations */}
                            {eq.recommandations?.length > 0 && (
                                <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                          <AlertTriangleIcon /> Recommandations IA
                        </span>
                                  <ul className="mt-2 space-y-2">
                                    {eq.recommandations.map((rec, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm text-slate-700 bg-gray-50 rounded-lg p-3"
                                        >
                                          {rec.startsWith("✅") ? <CheckCircleIcon /> : <AlertTriangleIcon />}
                                          <span>{rec.replace(/^[🔴🟠🟡🟢✅⚠️📋⏰🔧📉📦🛠️📅📊⚡🚨]\s*/, "")}</span>
                                        </li>
                                    ))}
                                  </ul>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <button
                                  onClick={() => runAnalysis(eq.id, "json", true)}
                                  disabled={analyzing}
                                  className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg transition-colors"
                              >
                                🔁 Ré-analyser cet équipement
                              </button>
                              <button
                                  onClick={() => window.open(`/equipements?id=${eq.id}`, "_self")}
                                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Voir la fiche équipement
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                ))}
              </div>
          )}
        </div>

        {/* ── Model Info Footer ───────────────── */}
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-indigo-600">
              <ChartIcon />
            </div>
            <div className="text-sm text-gray-600 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-slate-800">
                Modèle actif : {modelInfo?.disponible ? modelTypeLabel : "Score heuristique (repli)"}
              </span>
                {modelInfo?.disponible && modelInfo?.entraine_le && (
                    <span className="text-xs text-gray-500">Entraîné le {modelInfo.entraine_le}</span>
                )}
              </div>

              {modelInfo?.disponible && modelInfo?.metriques && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {modelInfo.metriques.auc != null && (
                        <span className="bg-white px-2 py-1 rounded border border-indigo-100">
                    AUC : <strong>{modelInfo.metriques.auc}</strong>
                  </span>
                    )}
                    {modelInfo.metriques.precision != null && (
                        <span className="bg-white px-2 py-1 rounded border border-indigo-100">
                    Précision : <strong>{modelInfo.metriques.precision}</strong>
                  </span>
                    )}
                    {modelInfo.metriques.recall != null && (
                        <span className="bg-white px-2 py-1 rounded border border-indigo-100">
                    Rappel : <strong>{modelInfo.metriques.recall}</strong>
                  </span>
                    )}
                    {modelInfo.nb_echantillons_entrainement != null && (
                        <span className="bg-white px-2 py-1 rounded border border-indigo-100">
                    n = <strong>{modelInfo.nb_echantillons_entrainement}</strong>
                  </span>
                    )}
                  </div>
              )}

              <span className="block mt-2 text-xs text-gray-500">
              Méthodologie : combinaison d'un score heuristique adaptatif (60% échelle métier +
              40% percentiles du parc) et d'un modèle ML (Random Forest ou Régression Logistique)
              évalué automatiquement. Si le modèle est moins fiable que le hasard (AUC &lt; 0.55),
              le score heuristique est conservé.
            </span>
            </div>
          </div>
        </div>
      </div>
  );
}