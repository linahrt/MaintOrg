import { useState, useEffect, useCallback, Fragment } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG — change this URL to your PocketBase instance
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");

// ──────────────────────────────────────────────
// STATUT CONFIG
// ──────────────────────────────────────────────
const STATUT_CONFIG = {
  hors_service:  { label: "Hors service",    classes: "bg-red-500 text-white" },
  operationnel:  { label: "Opérationnel",    classes: "bg-green-500 text-white" },
  arret_urgence: { label: "Arrêt d'urgence", classes: "bg-rose-600 text-white" },
  maintenance:   { label: "Maintenance",     classes: "bg-amber-400 text-white" },
};

// ──────────────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────────────
const StatusBadge = ({ statut }) => {
  const config = STATUT_CONFIG[statut] ?? { label: statut, classes: "bg-gray-200 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${config.classes}`}>
      {config.label}
    </span>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

// Icons
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const RefreshIcon = ({ spinning }) => (
  <svg className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);
const DotsIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ChevronRightIcon = ({ expanded }) => (
  <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const XIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const PackageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

// Pagination nav button
const NavBtn = ({ onClick, disabled, d }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points={d} />
    </svg>
  </button>
);

// ──────────────────────────────────────────────
// EQUIPEMENT MODAL (Add/Edit)
// ──────────────────────────────────────────────
const EquipementModal = ({ onClose, onSaved, equipement = null }) => {
  const isEdit = !!equipement;
  const [form, setForm] = useState({ 
    nom: equipement?.nom || "", 
    statut: equipement?.statut || "operationnel", 
    zone: equipement?.zone || "", 
    modele: equipement?.modele || "" 
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await pb.collection("equipements").update(equipement.id, form);
      } else {
        await pb.collection("equipements").create(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError("Erreur lors de " + (isEdit ? "la modification" : "la création") + " : " + (e.message ?? "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">{isEdit ? "Modifier l'équipement" : "Ajouter un équipement"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <XIcon />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Nom *</label>
            <input
              type="text"
              placeholder="ex: PUMP-003"
              value={form.nom}
              onChange={set("nom")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
            <select
              value={form.statut}
              onChange={set("statut")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
            >
              {Object.entries(STATUT_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Zone</label>
              <input
                type="text"
                placeholder="ex: Zone A"
                value={form.zone}
                onChange={set("zone")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Modèle</label>
              <input
                type="text"
                placeholder="ex: KSB 50"
                value={form.modele}
                onChange={set("modele")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <PlusIcon />
            }
            {isEdit ? "Modifier" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// PIECE MODAL (Add/Edit)
// ──────────────────────────────────────────────
const PieceModal = ({ onClose, onSaved, equipementId, piece = null }) => {
  const isEdit = !!piece;
  const [form, setForm] = useState({ 
    nom: piece?.nom || "", 
    statut: piece?.statut || "operationnel", 
    reference: piece?.reference || "",
    quantite: piece?.quantite || 1,
    equipement: equipementId 
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await pb.collection("pieces").update(piece.id, form);
      } else {
        await pb.collection("pieces").create(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError("Erreur lors de " + (isEdit ? "la modification" : "la création") + " : " + (e.message ?? "inconnue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">{isEdit ? "Modifier la pièce" : "Ajouter une pièce"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <XIcon />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Nom *</label>
            <input
              type="text"
              placeholder="ex: Roulement SKF-205"
              value={form.nom}
              onChange={set("nom")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
            <select
              value={form.statut}
              onChange={set("statut")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
            >
              {Object.entries(STATUT_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Référence</label>
              <input
                type="text"
                placeholder="ex: REF-12345"
                value={form.reference}
                onChange={set("reference")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Quantité</label>
              <input
                type="number"
                min="1"
                value={form.quantite}
                onChange={set("quantite")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <PlusIcon />
            }
            {isEdit ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// CONFIRM DELETE MODAL
// ──────────────────────────────────────────────
const ConfirmDeleteModal = ({ onClose, onConfirm, itemName, itemType = "élément" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">Confirmer la suppression</h3>
      <p className="text-sm text-gray-600 mb-6">
        Êtes-vous sûr de vouloir supprimer <strong>"{itemName}"</strong> ? Cette action est irréversible.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <TrashIcon /> Supprimer
        </button>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────
export default function Equipements() {
  const [equipments, setEquipments]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalItems, setTotalItems]   = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Equipement modals
  const [showEquipementModal, setShowEquipementModal] = useState(false);
  const [editEquipement, setEditEquipement] = useState(null);
  const [deleteEquipement, setDeleteEquipement] = useState(null);
  
  // Piece modals
  const [showPieceModal, setShowPieceModal] = useState(false);
  const [currentEquipementId, setCurrentEquipementId] = useState(null);
  const [editPiece, setEditPiece] = useState(null);
  const [deletePiece, setDeletePiece] = useState(null);
  
  // Expand state
  const [expandedId, setExpandedId] = useState(null);
  const [piecesMap, setPiecesMap] = useState({});
  const [loadingPieces, setLoadingPieces] = useState({});

 // Fetch equipments from PocketBase
const fetchEquipments = useCallback(async ({ silent = false } = {}) => {
  if (!silent) setLoading(true);
  else setRefreshing(true);

  setError("");

  const fetchWithRetry = async (fn, retries = 2, delay = 1000) => {
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
    const filter = search.trim()
      ? `nom ~ "${search}" || zone ~ "${search}" || modele ~ "${search}"`
      : "";

    const result = await fetchWithRetry(() =>
      pb.collection("equipements").getList(page, rowsPerPage, {
        sort: "-created",
        filter,
      })
    );

    setEquipments(result.items);
    setTotalPages(result.totalPages);
    setTotalItems(result.totalItems);
  } catch (e) {
    console.error(e);

    setError(
      "Impossible de charger les équipements. Vérifiez votre connexion PocketBase."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [search, page, rowsPerPage]);

  // Fetch pieces for an equipment
  const fetchPieces = useCallback(async (equipementId) => {
    if (piecesMap[equipementId]) return; // Déjà chargé
    
    setLoadingPieces(prev => ({ ...prev, [equipementId]: true }));
    try {
      // ⚠️ Assurez-vous que la collection "pieces" existe dans PocketBase
      // avec un champ relation "equipement" vers la collection "equipements"
      const pieces = await pb.collection("pieces").getFullList({
        filter: `equipement = "${equipementId}"`,
        sort: "nom",
      });
      
      setPiecesMap(prev => ({ ...prev, [equipementId]: pieces }));
    } catch (e) {
      console.error("Erreur lors du chargement des pièces:", e);
      // Si la collection n'existe pas encore, on affiche un message utile
      if (e.status === 404) {
        setError("La collection 'pieces' n'existe pas encore dans PocketBase.");
      } else {
        setError("Impossible de charger les pièces");
      }
    } finally {
      setLoadingPieces(prev => ({ ...prev, [equipementId]: false }));
    }
  }, [piecesMap]);

  // Toggle expand/collapse
  const toggleExpand = async (equipement) => {
    if (expandedId === equipement.id) {
      setExpandedId(null);
    } else {
      setExpandedId(equipement.id);
      await fetchPieces(equipement.id);
    }
  };

  // Handle equipement delete
  const handleEquipementDelete = async () => {
    if (!deleteEquipement) return;
    try {
      await pb.collection("equipements").delete(deleteEquipement.id);
      fetchEquipments({ silent: true });
      setDeleteEquipement(null);
      if (expandedId === deleteEquipement.id) {
        setExpandedId(null);
        setPiecesMap(prev => { const n = {...prev}; delete n[deleteEquipement.id]; return n; });
      }
    } catch (e) {
      setError("Erreur lors de la suppression : " + (e.message ?? "inconnue"));
    }
  };

  // Handle piece delete
  const handlePieceDelete = async () => {
    if (!deletePiece || !currentEquipementId) return;
    try {
      await pb.collection("pieces").delete(deletePiece.id);
      // Refresh pieces list for this equipment
      await fetchPieces(currentEquipementId);
      setDeletePiece(null);
    } catch (e) {
      setError("Erreur lors de la suppression de la pièce : " + (e.message ?? "inconnue"));
    }
  };

  // Refresh callback for modals
  const refreshEquipments = useCallback(() => fetchEquipments({ silent: true }), [fetchEquipments]);
  const refreshPieces = useCallback((equipementId) => fetchPieces(equipementId), [fetchPieces]);

  // Fetch on deps change
  useEffect(() => { fetchEquipments(); }, [fetchEquipments]);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  // Real-time subscription for equipements
  useEffect(() => {
    let unsubEquipements;
    let unsubPieces;
    (async () => {
      try {
        unsubEquipements = await pb.collection("equipements").subscribe("*", () => {
          fetchEquipments({ silent: true });
          setExpandedId(null);
          setPiecesMap({});
        });
        // Subscribe to pieces changes too
        unsubPieces = await pb.collection("pieces").subscribe("*", () => {
          if (expandedId) fetchPieces(expandedId);
        });
      } catch (_) {}
    })();
    return () => { 
      if (unsubEquipements) unsubEquipements(); 
      if (unsubPieces) unsubPieces(); 
    };
  }, [fetchEquipments, fetchPieces, expandedId]);

  const from = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to   = Math.min(page * rowsPerPage, totalItems);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <>
      {/* Modals */}
      {showEquipementModal && (
        <EquipementModal
          onClose={() => setShowEquipementModal(false)}
          onSaved={refreshEquipments}
        />
      )}
      {editEquipement && (
        <EquipementModal
          equipement={editEquipement}
          onClose={() => setEditEquipement(null)}
          onSaved={refreshEquipments}
        />
      )}
      {deleteEquipement && (
        <ConfirmDeleteModal
          itemName={deleteEquipement.nom}
          itemType="équipement"
          onClose={() => setDeleteEquipement(null)}
          onConfirm={handleEquipementDelete}
        />
      )}
      
      {/* Piece Modals */}
      {showPieceModal && currentEquipementId && (
        <PieceModal
          equipementId={currentEquipementId}
          onClose={() => { setShowPieceModal(false); setCurrentEquipementId(null); }}
          onSaved={() => currentEquipementId && refreshPieces(currentEquipementId)}
        />
      )}
      {editPiece && currentEquipementId && (
        <PieceModal
          equipementId={currentEquipementId}
          piece={editPiece}
          onClose={() => { setEditPiece(null); setCurrentEquipementId(null); }}
          onSaved={() => currentEquipementId && refreshPieces(currentEquipementId)}
        />
      )}
      {deletePiece && (
        <ConfirmDeleteModal
          itemName={deletePiece.nom}
          itemType="pièce"
          onClose={() => setDeletePiece(null)}
          onConfirm={handlePieceDelete}
        />
      )}

      <div className="p-4 bg-gray-50 max-h-screen font-sans rounded-xl">

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2 w-72 shadow-lg">
            <SearchIcon />
            <input
              type="text"
              placeholder="Recherche"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="outline-none text-sm text-gray-700 bg-transparent w-full placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XIcon />
              </button>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => fetchEquipments({ silent: true })}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Rafraîchir"
          >
            <RefreshIcon spinning={refreshing} />
          </button>

          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Options"
          >
            <DotsIcon />
          </button>

          <button
            onClick={() => setShowEquipementModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <PlusIcon />
            Équipement
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">NOM</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">STATUT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ZONE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">MODÈLE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">DATE CRÉÉE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7}><Spinner /></td></tr>
              ) : equipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    Aucun équipement trouvé.
                  </td>
                </tr>
              ) : (
                equipments.map((eq) => (
                  <Fragment key={eq.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleExpand(eq)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={expandedId === eq.id ? "Réduire" : "Développer"}
                        >
                          <ChevronRightIcon expanded={expandedId === eq.id} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">{eq.nom}</td>
                      <td className="px-4 py-4"><StatusBadge statut={eq.statut} /></td>
                      <td className="px-4 py-4 text-sm text-slate-600">{eq.zone}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{eq.modele}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(eq.created)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setEditEquipement(eq)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeleteEquipement(eq)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable row for pieces */}
                    {expandedId === eq.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-gradient-to-r from-gray-50/80 to-indigo-50/30">
                          <div className="pl-10 border-l-2 border-indigo-300 ml-3">
                            {/* Header with Add Piece button */}
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                                <PackageIcon />
                                Pièces ({piecesMap[eq.id]?.length || 0})
                              </h4>
                              <button
                                onClick={() => { setCurrentEquipementId(eq.id); setShowPieceModal(true); }}
                                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <PlusIcon /> Ajouter une pièce
                              </button>
                            </div>
                            
                            {/* Pieces list */}
                            {loadingPieces[eq.id] ? (
                              <div className="py-4 pl-2"><Spinner /></div>
                            ) : piecesMap[eq.id]?.length > 0 ? (
                              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {piecesMap[eq.id].map((piece) => (
                                  <li key={piece.id} className="group flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-300 hover:border-indigo-200 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                      <StatusBadge statut={piece.statut} />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium text-slate-700 truncate block">{piece.nom}</span>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          {piece.reference && (
                                            <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">{piece.reference}</span>
                                          )}
                                          {piece.quantite > 1 && (
                                            <span className="text-xs text-indigo-500 font-medium">×{piece.quantite}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Piece actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => { setCurrentEquipementId(eq.id); setEditPiece(piece); }}
                                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Modifier la pièce"
                                      >
                                        <EditIcon />
                                      </button>
                                      <button
                                        onClick={() => setDeletePiece(piece)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Supprimer la pièce"
                                      >
                                        <TrashIcon />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-center py-6 pl-2">
                                <p className="text-sm text-gray-400 italic mb-3">Aucune pièce ajoutée</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="outline-none text-gray-700 font-medium bg-transparent cursor-pointer border border-gray-200 rounded px-2 py-1"
              >
                {[5, 10, 20, 40].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <span className="font-medium text-gray-700">
              {totalItems === 0 ? "0 résultats" : `${from}–${to} sur ${totalItems}`}
            </span>

            <div className="flex items-center gap-1">
              <NavBtn onClick={() => setPage(1)}                               disabled={page === 1}                          d="11 17 6 12 11 7" />
              <NavBtn onClick={() => setPage((p) => Math.max(1, p - 1))}      disabled={page === 1}                          d="15 18 9 12 15 6" />
              <NavBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0} d="9 18 15 12 9 6" />
              <NavBtn onClick={() => setPage(totalPages)}                      disabled={page >= totalPages || totalPages === 0} d="13 17 18 12 13 7" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}