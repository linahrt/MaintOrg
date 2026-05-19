import { useState, useEffect, useCallback } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");
const AI_API_URL = "http://127.0.0.1:8000"; // Ton API FastAPI

// ──────────────────────────────────────────────
// HELPERS & FORMATTING
// ──────────────────────────────────────────────
const formatPercent = (val) => `${Math.round(val * 100)}%`;
const formatHours = (val) => val > 0 ? `${val.toFixed(1)}h` : "N/A";
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const RiskLevelBadge = ({ level }) => {
  const cfg = {
    "CRITIQUE": "bg-red-600 text-white",
    "ÉLEVÉ": "bg-orange-500 text-white",
    "MODÉRÉ": "bg-amber-400 text-white",
    "FAIBLE": "bg-green-500 text-white",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${cfg[level] || "bg-gray-200 text-gray-700"}`}>
      {level}
    </span>
  );
};

const ProbaBar = ({ value, method }) => {
  const color = value >= 0.7 ? "bg-red-500" : value >= 0.45 ? "bg-amber-500" : value >= 0.25 ? "bg-blue-400" : "bg-green-400";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">Probabilité de panne</span>
        <span className="font-semibold text-slate-800">{formatPercent(value)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5 block">{method === "lstm" ? "🧠 Prédiction LSTM" : "📊 Score heuristique"}</span>
    </div>
  );
};

// ──────────────────────────────────────────────
// ICONS (mêmes que ton app)
// ──────────────────────────────────────────────
const SearchIcon = () => (<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const RefreshIcon = ({ spinning }) => (<svg className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>);
const DownloadIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
const BrainIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4z"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><path d="M9 14h6"/></svg>);
const AlertTriangleIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
const CheckCircleIcon = () => (<svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const XIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const ChevronRightIcon = ({ expanded }) => (<svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>);

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

  // Fetch equipements list for filter dropdown
  const fetchEquipementsList = useCallback(async () => {
    try {
      const list = await pb.collection("equipements").getFullList({ sort: "nom" });
      setEquipementsList(list);
    } catch (e) {
      console.warn("Impossible de charger les équipements", e);
    }
  }, []);

  // Run AI Analysis
  const runAnalysis = useCallback(async (equipementId = null, format = "json") => {
    setAnalyzing(true);
    setError("");
    try {
      const response = await fetch(`${AI_API_URL}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipement_id: equipementId, output_format: format }),
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
      const result = await response.json();
      
      if (format === "json") {
        setAiData(result.analyse);
        setEquipements(result.analyse?.equipements || []);
      } else if (result.rapport_path) {
        // Download DOCX
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
  }, []);

  // Fetch dashboard summary
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_API_URL}/api/dashboard`);
      if (!res.ok) throw new Error("Erreur chargement dashboard");
      const data = await res.json();
      setAiData(data);
      // Pour la liste complète, on lance aussi l'analyse JSON
      runAnalysis(null, "json");
    } catch (e) {
      setError("Impossible de charger le dashboard IA");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [runAnalysis]);

  useEffect(() => {
    fetchEquipementsList();
    fetchDashboard();
  }, [fetchDashboard, fetchEquipementsList]);

  // Filtered & searched equipements
  const filteredEquipements = (aiData?.equipements || equipements).filter(eq => {
    const matchSearch = !search || eq.nom?.toLowerCase().includes(search.toLowerCase()) || eq.zone?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = !filterRisk || eq.niveau_risque === filterRisk;
    return matchSearch && matchRisk;
  });

  // Stats
  const stats = aiData?.stats || aiData?.stats_globales || {};
  const critiques = filteredEquipements.filter(e => e.niveau_risque === "CRITIQUE");
  const eleves = filteredEquipements.filter(e => e.niveau_risque === "ÉLEVÉ");

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
            <BrainIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Module IA – Analyse Prédictive</h1>
            <p className="text-sm text-gray-500">Prédiction des pannes par deep learning (LSTM)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runAnalysis(null, "docx")}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <DownloadIcon /> Exporter rapport
          </button>
          <button
            onClick={fetchDashboard}
            disabled={analyzing}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Rafraîchir"
          >
            <RefreshIcon spinning={analyzing} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangleIcon /> {error}
        </div>
      )}

      {/* Report Download Banner */}
      {reportUrl && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <span>✅ Rapport généré avec succès !</span>
          <a href={reportUrl} download className="font-semibold underline hover:text-green-900">Télécharger le fichier .docx</a>
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-5 border border-gray-300 animate-pulse h-28" />)}
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
            <div className="text-3xl font-bold text-indigo-600">{stats.taux_maintenance_preventive || 0}%</div>
            <div className="text-sm text-gray-500">Maintenance préventive</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
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
          onClick={() => { setSearch(""); setFilterRisk(""); }}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Réinitialiser
        </button>
      </div>

      {/* Equipment List */}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Analyse par équipement</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{filteredEquipements.length} résultats</span>
        </div>

        {analyzing ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p>Analyse en cours avec le modèle LSTM...</p>
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
                    <div className="w-32">
                      <ProbaBar value={eq.proba_panne_lstm || 0} method={eq.methode_prediction} />
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
                        <p className="text-slate-700 mt-1 font-medium">{eq.days_since_last_failure !== null ? `Il y a ${eq.days_since_last_failure}j` : "Jamais"}</p>
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
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-gray-50 rounded-lg p-3">
                              {rec.startsWith("✅") ? <CheckCircleIcon /> : <AlertTriangleIcon />}
                              <span>{rec.replace(/^[🔴🟠🟡🟢✅⚠️📋⏰🔧📉📦🛠️📅📊⚡]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <button
                        onClick={() => runAnalysis(eq.id, "json")}
                        className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        🔁 Re-analyser cet équipement
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

      {/* Model Info Footer */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
        <div className="flex items-start gap-3">
          <BrainIcon />
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-slate-800">Modèle utilisé :</span> LSTM (Long Short-Term Memory) avec 2 couches, dropout 0.2, entraîné sur les historiques de pannes et indicateurs de risque. 
            <span className="block mt-1 text-xs text-gray-500">
              Méthodologie : Les features incluent MTTR, MTBF, fréquence des pannes, retards d'OT, niveau de stock, et statut des plans préventifs. 
              La prédiction est mise à jour à chaque analyse.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}