import { useState, useEffect, useCallback, useMemo } from "react";
import PocketBase from "pocketbase";
import { 
  Wrench, AlertTriangle, ClipboardList, Package, 
  CalendarCheck, RefreshCw, Clock, TrendingUp, 
  CheckCircle2, XCircle, AlertCircle 
} from "lucide-react";

const pb = new PocketBase("http://127.0.0.1:8090");

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
const countBy = (items, key, value) => items.filter(i => i[key] === value).length;
const countByMultiple = (items, key, values) => items.filter(i => values.includes(i[key])).length;
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

const StatusBadge = ({ statut, type }) => {
  const colors = {
    // Pannes
    nouvelle: "bg-blue-100 text-blue-700",
    en_cours: "bg-amber-100 text-yellow-700",
    résolue: "bg-green-100 text-green-700",
    non_reparable: "bg-red-100 text-red-700",
    // OT
    brouillon: "bg-gray-100 text-gray-700",
    planifie: "bg-indigo-100 text-indigo-700",
    en_cours: "bg-amber-100 text-amber-700",
    termine: "bg-green-100 text-green-700",
    annule: "bg-red-100 text-red-700",
    // Équipements
    hors_service: "bg-red-100 text-red-700",
    operationnel: "bg-green-100 text-green-700",
    maintenance: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors[statut] || "bg-gray-100 text-gray-600"}`}>
      {statut?.replace("_", " ") || "—"}
    </span>
  );
};

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState({ equipements: [], ordresdetravail: [], pannes: [], pieces: [], plans_preventifs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
const fetchData = useCallback(async ({ silent = false } = {}) => {
  if (!silent) setLoading(true);
  else setRefreshing(true);

  setError("");

  const fetchWithRetry = async (fn, retries = 2, delay = 50) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        // attendre avant le prochain essai
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };

  try {
    const [eq, ot, pn, pc, pl] = await fetchWithRetry(() =>
      Promise.all([
        pb.collection("equipements").getFullList({ sort: "-created" }),
        pb.collection("ordresdetravail").getFullList({ sort: "-created" }),
        pb.collection("pannes").getFullList({ sort: "-date_panne" }),
        pb.collection("pieces").getFullList(),
        pb.collection("plans_preventifs").getFullList({
          filter: "statut = 'actif'",
        }),
      ])
    );

    setData({
      equipements: eq,
      ordresdetravail: ot,
      pannes: pn,
      pieces: pc,
      plans_preventifs: pl,
    });
  } catch (e) {
    console.error(e);

    setError(
      "Impossible de charger les données. Vérifiez votre connexion PocketBase."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    const collections = ["equipements", "ordresdetravail", "pannes", "pieces", "plans_preventifs"];
    const unsubs = [];
    collections.forEach(col => {
      pb.collection(col).subscribe("*", () => fetchData({ silent: true }));
    });
    return () => collections.forEach(col => pb.collection(col).unsubscribe("*"));
  }, [fetchData]);

  // ──────────────────────────────────────────────
  // METRICS CALCULATION
  // ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const { equipements, ordresdetravail, pannes, pieces, plans_preventifs } = data;
    
    return {
      equipementsTotal: equipements.length,
      equipementsHS: countBy(equipements, "statut", "hors_service"),
      equipementsOp: countBy(equipements, "statut", "operationnel"),
      
      pannesOuvertes: countByMultiple(pannes, "statut", ["nouvelle", "en_cours", "en_attente"]),
      pannesNouvelles: countBy(pannes, "statut", "nouvelle"),
      
      otTotal: ordresdetravail.length,
      otEnCours: countByMultiple(ordresdetravail, "statut", ["en_cours", "planifie"]),
      otPrioriteHaute: countByMultiple(ordresdetravail, "priorite", ["haute", "critique"]),
      
      piecesTotal: pieces.length,
      piecesQte: pieces.reduce((sum, p) => sum + (Number(p.quantite) || 0), 0),
      
      plansActifs: plans_preventifs.length,
    };
  }, [data]);

  // ──────────────────────────────────────────────
  // UI RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de la maintenance en temps réel</p>
        </div>
        <button
          onClick={() => fetchData({ silent: true })}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-lg"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>


      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-300 shadow-lg animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Équipements */}
            <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Wrench className="w-5 h-5" /></div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Parcs</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{metrics.equipementsTotal}</div>
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="text-green-600 font-medium">{metrics.equipementsOp} opérationnels</span>
                {metrics.equipementsHS > 0 && <span className="text-red-600 font-medium">• {metrics.equipementsHS} HS</span>}
              </div>
            </div>

            {/* Pannes ouvertes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertTriangle className="w-5 h-5" /></div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Pannes</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{metrics.pannesOuvertes}</div>
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="text-blue-600 font-medium">{metrics.pannesNouvelles} nouvelles</span>
              </div>
            </div>

            {/* OT en cours */}
            <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><ClipboardList className="w-5 h-5" /></div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Interventions</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{metrics.otEnCours}</div>
              <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="text-gray-600">Sur {metrics.otTotal} OTs</span>
                {metrics.otPrioriteHaute > 0 && <span className="text-red-600 font-medium">• {metrics.otPrioriteHaute} critiques</span>}
              </div>
            </div>

            {/* Préventif & Stock */}
            <div className="bg-white rounded-2xl p-5 border border-gray-300 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CalendarCheck className="w-5 h-5" /></div>
                <span className="text-xs font-semibold text-gray-400 uppercase">Préventif</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{metrics.plansActifs}</div>
              <div className="text-sm text-gray-500 mt-1">
                {metrics.piecesTotal} pièces • {metrics.piecesQte.toLocaleString()} unités en stock
              </div>
            </div>
          </div>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Derniers Ordres de Travail */}
            <div className="bg-white rounded-2xl border border-gray-300 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" /> Derniers Ordres de Travail
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{data.ordresdetravail.length} au total</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
                {data.ordresdetravail.slice(0, 2).map((ot) => (
                  <div key={ot.id} className="px-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{ot.titre || ot.reference}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{ot.equipement ? "Équipement lié" : "Sans équipement"}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <StatusBadge statut={ot.statut} type="ot" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ot.created)}</span>
                    </div>
                  </div>
                ))}
                {data.ordresdetravail.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Aucun ordre de travail enregistré.</div>
                )}
              </div>
            </div>

            {/* Dernières Pannes */}
            <div className="bg-white rounded-2xl border border-gray-300 shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Dernières Pannes
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{data.pannes.length} au total</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
                {data.pannes.slice(0, 2).map((panne) => (
                  <div key={panne.id} className="px-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{panne.titre}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">{panne.priorite || "priorité non définie"}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <StatusBadge statut={panne.statut} type="panne" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(panne.date_panne || panne.created)}</span>
                    </div>
                  </div>
                ))}
                {data.pannes.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">Aucune panne enregistrée.</div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Status Distribution & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Équipement Status Distribution */}
            <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-5">
              <h3 className="font-semibold text-slate-800 mb-4">État du parc équipements</h3>
              <div className="space-y-3">
                {[
                  { label: "Opérationnel", count: metrics.equipementsOp, color: "bg-green-500", total: metrics.equipementsTotal },
                  { label: "Maintenance", count: countBy(data.equipements, "statut", "maintenance"), color: "bg-purple-500", total: metrics.equipementsTotal },
                  { label: "Hors service", count: metrics.equipementsHS, color: "bg-red-500", total: metrics.equipementsTotal },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color} transition-all duration-500`} 
                        style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priorité OT */}
            <div className="bg-white rounded-2xl border border-gray-300 shadow-lg p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Priorité des interventions</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Critique", count: countBy(data.ordresdetravail, "priorite", "critique"), icon: <XCircle className="w-4 h-4 text-red-500" /> },
                  { label: "Haute", count: countBy(data.ordresdetravail, "priorite", "haute"), icon: <AlertCircle className="w-4 h-4 text-orange-500" /> },
                  { label: "Moyenne", count: countBy(data.ordresdetravail, "priorite", "moyenne"), icon: <AlertCircle className="w-4 h-4 text-yellow-500" /> },
                  { label: "Basse", count: countBy(data.ordresdetravail, "priorite", "basse"), icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="p-1.5 bg-white rounded-lg shadow-lg">{p.icon}</div>
                    <div>
                      <div className="text-lg font-bold text-slate-800">{p.count}</div>
                      <div className="text-xs text-gray-500">{p.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats / Info */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg p-5 text-white flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">Résumé du jour</h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  {metrics.otEnCours} intervention{metrics.otEnCours > 1 ? "s" : ""} en cours.
                  {metrics.pannesNouvelles > 0 ? ` ${metrics.pannesNouvelles} nouvelle${metrics.pannesNouvelles > 1 ? "s" : ""} panne${metrics.pannesNouvelles > 1 ? "s" : ""} à traiter.` : " Aucune nouvelle panne signalée."}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="text-blue-100">Plans préventifs actifs</span>
                <span className="font-bold bg-white/20 px-2 py-0.5 rounded">{metrics.plansActifs}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}