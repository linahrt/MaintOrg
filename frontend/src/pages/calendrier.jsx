import { useState, useEffect, useCallback } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");

const STATUT_CONFIG = {
  actif:   { label: "Actif",    color: "bg-green-500" },
  inactif: { label: "Inactif",  color: "bg-gray-400" },
  pause:   { label: "En pause", color: "bg-amber-500" },
};

const FREQUENCE_CONFIG = {
  quotidien:    { label: "Quotidien",   jours: 1,   color: "bg-blue-500" },
  hebdomadaire: { label: "Hebdo",       jours: 7,   color: "bg-indigo-500" },
  mensuel:      { label: "Mensuel",     jours: 30,  color: "bg-purple-500" },
  trimestriel:  { label: "Trimestriel", jours: 90,  color: "bg-pink-500" },
  semestriel:   { label: "Semestriel",  jours: 180, color: "bg-orange-500" },
  annuel:       { label: "Annuel",      jours: 365, color: "bg-red-500" },
};

const JOURS_SEMAINE = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const isToday = (d) => {
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const generateOccurrencesForMonth = (plan, year, month) => {
  const occurrences = [];
  const startDate = new Date(plan.date_debut || plan.created);
  const freq = FREQUENCE_CONFIG[plan.frequence];
  if (!freq || !plan.date_debut) return occurrences;

  let current = new Date(startDate);
  const targetStart = new Date(year, month, 1);
  const targetEnd = new Date(year, month + 1, 0);

  while (current < targetStart) current.setDate(current.getDate() + freq.jours);
  while (current <= targetEnd) {
    occurrences.push({
      id: `${plan.id}-${current.toISOString()}`,
      planId: plan.id,
      planNom: plan.nom,
      equipement: plan.expand?.equipement?.nom || "Équipement",
      date: new Date(current),
      statut: plan.statut,
      frequence: plan.frequence,
      responsable: plan.responsable,
      duree: plan.duree_estimee,
    });
    current.setDate(current.getDate() + freq.jours);
  }
  return occurrences;
};

// ──────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────
const ChevronLeftIcon  = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>);
const ChevronRightIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>);
const CalendarIcon     = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const RefreshIcon      = ({ spinning }) => (<svg className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>);
const XIcon            = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const ClockIcon        = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const UserIcon         = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const FilterIcon       = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>);
const PlusIcon         = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const TrashIcon        = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>);

// ──────────────────────────────────────────────
// SUB-COMPONENT : StatusDot
// ──────────────────────────────────────────────
const StatusDot = ({ statut }) => {
  const cfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.actif;
  return <span className={`inline-block w-2 h-2 rounded-full ${cfg.color} mr-1.5`} />;
};

// ──────────────────────────────────────────────
// SUB-COMPONENT : DeleteButton
// ──────────────────────────────────────────────
const DeleteButton = ({ planId, onDeleted }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await pb.collection("plans_preventifs").delete(planId);
      onDeleted();
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("Échec de la suppression : " + (err.message || "Erreur inconnue"));
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between gap-2 bg-red-50 rounded-lg px-3 py-2">
        <p className="text-xs text-red-700 font-medium">
          Supprimer ce plan définitivement ?
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
          >
            {deleting ? (
              <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <TrashIcon />
            )}
            Confirmer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 transition-colors"
      >
        <TrashIcon />
        Supprimer le plan
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────
// MODAL : Ajouter un plan préventif
// ──────────────────────────────────────────────
const AddPlanModal = ({ onClose, onSaved, equipements, selectedDate = null }) => {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    nom: "",
    equipement: "",
    frequence: "mensuel",
    statut: "actif",
    date_debut: selectedDate ? selectedDate.toISOString().split("T")[0] : today,
    responsable: "",
    duree_estimee: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) { setError("Le nom est requis."); return; }
    if (!form.equipement) { setError("Un équipement doit être sélectionné."); return; }
    setSaving(true);
    setError("");
    try {
      await pb.collection("plans_preventifs").create({
        ...form,
        duree_estimee: form.duree_estimee ? parseFloat(form.duree_estimee) : null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError("Erreur : " + (err.message || "Échec de la création"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">Nouvelle intervention préventive</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <XIcon />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Nom du plan *</label>
            <input
              type="text" placeholder="ex: Contrôle mensuel pompe"
              value={form.nom} onChange={set("nom")} required
              className="w-full border border-gray-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 text-black"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Équipement *</label>
            <select value={form.equipement} onChange={set("equipement")} required
              className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Sélectionner...</option>
              {equipements.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nom} {eq.zone ? `— ${eq.zone}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Fréquence</label>
              <select value={form.frequence} onChange={set("frequence")}
                className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {Object.entries(FREQUENCE_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
              <select value={form.statut} onChange={set("statut")}
                className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {Object.entries(STATUT_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Date de début *</label>
            <input type="date" value={form.date_debut} onChange={set("date_debut")} required
              className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Responsable</label>
              <input type="text" placeholder="ex: Équipe A" value={form.responsable} onChange={set("responsable")}
                className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Durée estimée (h)</label>
              <input type="number" min="0" step="0.5" placeholder="ex: 2" value={form.duree_estimee} onChange={set("duree_estimee")}
                className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
            <textarea rows={3} placeholder="Détails de l'intervention..." value={form.description} onChange={set("description")}
              className="w-full border border-gray-600 rounded-xl text-black px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <PlusIcon />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// MAIN COMPONENT : Calendrier Préventif
// ──────────────────────────────────────────────
export default function CalendrierPreventif() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [filterEquipement, setFilterEquipement] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [equipementsList, setEquipementsList] = useState([]);

  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState(null);

  const fetchPlans = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const result = await pb.collection("plans_preventifs").getFullList({
        filter: "statut = 'actif'",
        expand: "equipement",
        sort: "nom",
      });
      setPlans(result);
    } catch (e) {
      setError("Impossible de charger les plans de maintenance.");
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchEquipements = useCallback(async () => {
    try {
      const list = await pb.collection("equipements").getFullList({ sort: "nom" });
      setEquipementsList(list);
    } catch (e) {
      console.warn("Impossible de charger les équipements", e);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchEquipements();
  }, [fetchPlans, fetchEquipements]);

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        unsub = await pb.collection("plans_preventifs").subscribe("*", () =>
          fetchPlans({ silent: true })
        );
      } catch (_) {}
    })();
    return () => { if (unsub) unsub(); };
  }, [fetchPlans]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };
  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Build calendar grid
  const daysInMonth   = getDaysInMonth(currentYear, currentMonth);
  const firstDay      = getFirstDayOfMonth(currentYear, currentMonth);
  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  const calendarCells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    calendarCells.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(currentYear, currentMonth - 1, prevMonthDays - i) });
  for (let d = 1; d <= daysInMonth; d++)
    calendarCells.push({ day: d, currentMonth: true, date: new Date(currentYear, currentMonth, d) });
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++)
    calendarCells.push({ day: d, currentMonth: false, date: new Date(currentYear, currentMonth + 1, d) });

  // Filter & occurrences
  const filteredPlans = plans.filter((p) => {
    if (filterEquipement && p.equipement !== filterEquipement) return false;
    if (filterStatut && p.statut !== filterStatut) return false;
    return true;
  });

  const occurrencesByDay = {};
  filteredPlans.forEach((plan) => {
    generateOccurrencesForMonth(plan, currentYear, currentMonth).forEach((occ) => {
      const key = `${occ.date.getFullYear()}-${occ.date.getMonth()}-${occ.date.getDate()}`;
      if (!occurrencesByDay[key]) occurrencesByDay[key] = [];
      occurrencesByDay[key].push(occ);
    });
  });

  const getOccurrencesForCell = (cell) => {
    const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
    return occurrencesByDay[key] || [];
  };

  const totalInterventions = Object.values(occurrencesByDay).flat().length;
  const upcomingCount = Object.values(occurrencesByDay).flat().filter((occ) => occ.date >= today).length;

  const handleAddClick = (date = null) => {
    setSelectedDateForNew(date);
    setShowAddModal(true);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen rounded-xl font-sans">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Calendrier Préventif</h1>
          <p className="text-sm text-gray-500">
            {totalInterventions} interventions ce mois • {upcomingCount} à venir
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddClick()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg"
          >
            <PlusIcon /> Nouvelle intervention
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              showFilters ? "bg-indigo-100 text-indigo-700" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FilterIcon /> Filtres
          </button>
          <button
            onClick={() => fetchPlans({ silent: true })}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Rafraîchir"
          >
            <RefreshIcon spinning={refreshing} />
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Équipement</label>
            <select value={filterEquipement} onChange={(e) => setFilterEquipement(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tous</option>
              {equipementsList.map((eq) => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tous</option>
              {Object.entries(STATUT_CONFIG).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setFilterEquipement(""); setFilterStatut(""); }}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Calendar Container ── */}
      <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600">
            <ChevronLeftIcon />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 min-w-[200px] text-center">
              {MOIS[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToToday}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              Aujourd'hui
            </button>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600">
            <ChevronRightIcon />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-300">
          {JOURS_SEMAINE.map((jour) => (
            <div key={jour} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
              {jour}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {loading
            ? Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="min-h-[120px] border-b border-r border-gray-100 p-2 bg-gray-50 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-gray-200 mb-2" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))
            : calendarCells.map((cell, idx) => {
                const occs = getOccurrencesForCell(cell);
                const isTodayDate = isToday(cell.date);
                const hasEvents = occs.length > 0;
                const isCurrentMonth = cell.currentMonth;

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] border-b border-r border-gray-100 p-2 transition-colors relative group cursor-pointer
                      ${!isCurrentMonth ? "bg-gray-50/50 text-gray-400" : "bg-white"}
                      ${isTodayDate ? "bg-indigo-50/50" : ""}
                      ${hasEvents ? "hover:bg-indigo-50/30" : "hover:bg-gray-50"}
                    `}
                    onClick={() => { if (occs.length > 0) setSelectedOccurrence(occs); }}
                  >
                    {/* Day number + quick-add */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                        ${isTodayDate ? "bg-indigo-600 text-white" : isCurrentMonth ? "text-slate-700" : "text-gray-300"}
                      `}>
                        {cell.day}
                      </span>
                      {isCurrentMonth && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddClick(cell.date); }}
                          className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Ajouter une intervention ce jour"
                        >
                          <PlusIcon />
                        </button>
                      )}
                      {hasEvents && !isTodayDate && (
                        <span className="text-xs text-gray-400 font-medium">{occs.length}</span>
                      )}
                    </div>

                    {/* Occurrence pills */}
                    <div className="space-y-1">
                      {occs.slice(0, 3).map((occ) => {
                        const freq = FREQUENCE_CONFIG[occ.frequence];
                        return (
                          <div
                            key={occ.id}
                            className={`text-xs px-2 py-1 rounded-md font-medium truncate cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${freq?.color || "bg-gray-400"} text-white`}
                            onClick={(e) => { e.stopPropagation(); setSelectedOccurrence([occ]); }}
                            title={`${occ.planNom} — ${occ.equipement}`}
                          >
                            {occ.planNom}
                          </div>
                        );
                      })}
                      {occs.length > 3 && (
                        <div className="text-xs text-gray-400 font-medium pl-1">
                          +{occs.length - 3} autre{occs.length - 3 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Hover border glow */}
                    {hasEvents && (
                      <div className="absolute inset-0 border-2 border-indigo-200 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-lg p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fréquences</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(FREQUENCE_CONFIG).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal : Détail occurrence + Supprimer ── */}
      {selectedOccurrence && selectedOccurrence.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedOccurrence(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {selectedOccurrence.length === 1 ? "Détail de l'intervention" : `${selectedOccurrence.length} interventions`}
              </h3>
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <XIcon />
              </button>
            </div>

            <div className="space-y-3">
              {selectedOccurrence.map((occ) => {
                const freq = FREQUENCE_CONFIG[occ.frequence];
                const stat = STATUT_CONFIG[occ.statut];
                return (
                  <div key={occ.id} className="border border-gray-200 rounded-xl p-4">
                    {/* En-tête de la carte */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${freq?.color || "bg-gray-400"}`} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{occ.planNom}</h4>
                        <p className="text-sm text-gray-500">{occ.equipement}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${stat?.color || "bg-gray-200"} text-white`}>
                        {stat?.label || occ.statut}
                      </span>
                    </div>

                    {/* Détails */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CalendarIcon />
                        <span>
                          {occ.date.toLocaleDateString("fr-FR", {
                            weekday: "long", day: "numeric",
                            month: "long", year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <ClockIcon />
                        <span>{occ.duree ? `${occ.duree}h estimées` : "Durée non définie"}</span>
                      </div>
                      {occ.responsable && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserIcon />
                          <span>{occ.responsable}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Fréquence</span>
                        <span>{freq?.label || occ.frequence}</span>
                      </div>
                    </div>

                    {/* ✅ Bouton Supprimer avec double confirmation */}
                    <DeleteButton
                      planId={occ.planId}
                      onDeleted={() => {
                        const remaining = selectedOccurrence.filter((o) => o.planId !== occ.planId);
                        setSelectedOccurrence(remaining.length > 0 ? remaining : null);
                        fetchPlans({ silent: true });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Ajouter un plan ── */}
      {showAddModal && (
        <AddPlanModal
          onClose={() => { setShowAddModal(false); setSelectedDateForNew(null); }}
          onSaved={() => { fetchPlans({ silent: true }); }}
          equipements={equipementsList}
          selectedDate={selectedDateForNew}
        />
      )}
    </div>
  );
}