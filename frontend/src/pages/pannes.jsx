import { useState, useEffect, useCallback, Fragment } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG — PocketBase instance
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");

// ──────────────────────────────────────────────
// STATUT CONFIG pour les pannes
// ──────────────────────────────────────────────
const STATUT_PANNE_CONFIG = {
  nouvelle:      { label: "Nouvelle",        classes: "bg-blue-500 text-white" },
  en_cours:      { label: "En cours",        classes: "bg-amber-500 text-white" },
  en_attente:    { label: "En attente",      classes: "bg-red-500 text-white" },
  résolue:       { label: "Résolue",         classes: "bg-green-500 text-white" },
  non_reparable: { label: "Non réparable",   classes: "bg-red-600 text-white" },
};

const PRIORITE_CONFIG = {
  basse:   { label: "Basse",   classes: "bg-gray-200 text-gray-700" },
  moyenne: { label: "Moyenne", classes: "bg-amber-200 text-amber-800" },
  haute:   { label: "Haute",   classes: "bg-orange-400 text-white" },
  critique:{ label: "Critique",classes: "bg-red-600 text-white" },
};

// ──────────────────────────────────────────────
// PDF GENERATION — Fiche Technicien
// ──────────────────────────────────────────────

/**
 * Génère et télécharge une fiche technicien en PDF pour une panne donnée.
 * Utilise jsPDF chargé dynamiquement depuis CDN.
 */
const generateFicheTechnicien = async (panne, getEquipementName) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210; // largeur A4 mm
  const MARGIN = 18;
  const COL = W - MARGIN * 2;
  let y = 0;

  // ── Helpers ───────────────────────────────────
  const setFont = (style = "normal", size = 10) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  const text = (str, x, yPos, opts = {}) => {
    doc.text(str ?? "—", x, yPos, opts);
  };

  const wrapText = (str, x, yPos, maxW, lineH = 5) => {
    if (!str) { text("—", x, yPos); return yPos + lineH; }
    const lines = doc.splitTextToSize(str, maxW);
    doc.text(lines, x, yPos);
    return yPos + lines.length * lineH;
  };

  const hrLine = (yPos, color = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.line(MARGIN, yPos, W - MARGIN, yPos);
    doc.setDrawColor(0);
  };

  const rect = (x, yPos, w, h, fillColor, strokeColor) => {
    if (fillColor) doc.setFillColor(...fillColor);
    if (strokeColor) doc.setDrawColor(...strokeColor);
    doc.roundedRect(x, yPos, w, h, 2, 2, fillColor ? "FD" : "D");
    doc.setFillColor(0);
    doc.setDrawColor(0);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return formatDate(iso) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const prioriteLabel = PRIORITE_CONFIG[panne.priorite]?.label ?? panne.priorite ?? "—";
  const statutLabel   = STATUT_PANNE_CONFIG[panne.statut]?.label ?? panne.statut ?? "—";
  const equipementNom = getEquipementName(panne);

  // Couleur priorité
  const prioriteColor = {
    basse:    [100, 120, 100],
    moyenne:  [180, 120, 30],
    haute:    [210, 100, 30],
    critique: [200, 40, 40],
  }[panne.priorite] ?? [100, 100, 100];

  // ── EN-TÊTE ───────────────────────────────────
  y = MARGIN;

  // Bandeau gris foncé
  doc.setFillColor(35, 38, 48);
  doc.roundedRect(MARGIN, y, COL, 22, 3, 3, "F");

  setFont("bold", 16);
  doc.setTextColor(255, 255, 255);
  text("FICHE D'INTERVENTION TECHNICIEN", MARGIN + 6, y + 10);

  setFont("normal", 8);
  doc.setTextColor(180, 185, 200);
  const now = new Date();
  text(
    `Générée le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    MARGIN + 6,
    y + 17
  );

  // N° de panne (coin droit)
  setFont("bold", 8);
  doc.setTextColor(200, 205, 220);
  text(`Réf. panne : #${panne.id?.slice(-8).toUpperCase() ?? "—"}`, W - MARGIN - 6, y + 10, { align: "right" });

  doc.setTextColor(0, 0, 0);
  y += 28;

  // ── TITRE DE LA PANNE ─────────────────────────
  setFont("bold", 14);
  doc.setTextColor(20, 20, 60);
  y = wrapText(panne.titre ?? "Sans titre", MARGIN, y, COL, 7);
  doc.setTextColor(0, 0, 0);
  y += 2;

  // Badge statut + priorité inline
  const badgeY = y;
  // Statut
  const statutBg = {
    nouvelle:      [66, 120, 220],
    en_cours:      [210, 150, 30],
    en_attente:    [200, 60, 60],
    résolue:       [40, 160, 80],
    non_reparable: [180, 30, 30],
  }[panne.statut] ?? [120, 120, 120];

  doc.setFillColor(...statutBg);
  doc.roundedRect(MARGIN, badgeY, 32, 6, 1.5, 1.5, "F");
  setFont("bold", 7);
  doc.setTextColor(255, 255, 255);
  text(statutLabel.toUpperCase(), MARGIN + 16, badgeY + 4.2, { align: "center" });

  // Priorité
  doc.setFillColor(...prioriteColor);
  doc.roundedRect(MARGIN + 34, badgeY, 28, 6, 1.5, 1.5, "F");
  text(prioriteLabel.toUpperCase(), MARGIN + 48, badgeY + 4.2, { align: "center" });

  doc.setTextColor(0, 0, 0);
  y += 12;
  hrLine(y, [220, 220, 220]);
  y += 6;

  // ── SECTION : INFORMATIONS GÉNÉRALES ─────────────
  const sectionHeader = (title, yPos) => {
    doc.setFillColor(240, 241, 248);
    doc.rect(MARGIN, yPos, COL, 7, "F");
    setFont("bold", 9);
    doc.setTextColor(40, 50, 120);
    text(title, MARGIN + 3, yPos + 4.8);
    doc.setTextColor(0, 0, 0);
    return yPos + 10;
  };

  const fieldRow = (label, value, xStart, yPos, colW) => {
    setFont("bold", 8);
    doc.setTextColor(90, 90, 110);
    text(label, xStart, yPos);
    setFont("normal", 9);
    doc.setTextColor(20, 20, 40);
    text(String(value ?? "—"), xStart, yPos + 5);
    doc.setTextColor(0, 0, 0);
    return yPos + 11;
  };

  y = sectionHeader("1. INFORMATIONS GÉNÉRALES", y);

  // Deux colonnes
  const C1 = MARGIN;
  const C2 = MARGIN + COL / 2 + 3;
  const CW = COL / 2 - 3;

  fieldRow("Équipement concerné", equipementNom, C1, y, CW);
  fieldRow("Technicien assigné", panne.technicien || "Non assigné", C2, y, CW);
  y += 12;

  fieldRow("Date de la panne", formatDate(panne.date_panne), C1, y, CW);
  fieldRow("Date de résolution prévue", panne.date_resolution ? formatDate(panne.date_resolution) : "En cours", C2, y, CW);
  y += 12;

  fieldRow("Statut actuel", statutLabel, C1, y, CW);
  fieldRow("Priorité", prioriteLabel, C2, y, CW);
  y += 12;

  fieldRow("Fiche créée le", formatDateTime(panne.created), C1, y, CW);
  fieldRow("Dernière modification", formatDateTime(panne.updated), C2, y, CW);
  y += 14;

  // ── SECTION : DESCRIPTION DE LA PANNE ────────────
  y = sectionHeader("2. DESCRIPTION DE LA PANNE", y);
  setFont("normal", 9);
  if (panne.description?.trim()) {
    y = wrapText(panne.description, MARGIN + 2, y, COL - 4, 5.5);
  } else {
    doc.setTextColor(150, 150, 150);
    text("Aucune description fournie.", MARGIN + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }
  y += 6;

  // ── SECTION : NOTES INTERNES ──────────────────────
  if (panne.notes?.trim()) {
    y = sectionHeader("3. NOTES INTERNES (équipe maintenance)", y);
    doc.setFillColor(255, 248, 230);
    const notesLines = doc.splitTextToSize(panne.notes, COL - 10);
    const notesH = notesLines.length * 5.5 + 8;
    doc.roundedRect(MARGIN, y, COL, notesH, 2, 2, "F");
    doc.setDrawColor(210, 160, 40);
    doc.roundedRect(MARGIN, y, COL, notesH, 2, 2, "D");
    doc.setDrawColor(0);

    setFont("normal", 8.5);
    doc.setTextColor(100, 70, 10);
    doc.text(notesLines, MARGIN + 5, y + 6);
    doc.setTextColor(0, 0, 0);
    y += notesH + 8;
  } else {
    y = sectionHeader("3. NOTES INTERNES", y);
    doc.setTextColor(150, 150, 150);
    setFont("normal", 9);
    text("Aucune note interne.", MARGIN + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // ── SECTION : CHECKLIST TECHNICIEN ───────────────
  y = sectionHeader("4. CHECKLIST D'INTERVENTION", y);

  const checkItems = [
    "Équipements de protection individuelle (EPI) portés",
    "Consignation / déconsignation de l'équipement effectuée",
    "Zone de travail sécurisée et balisée",
    "Diagnostic initial réalisé et cause identifiée",
    "Pièces de rechange commandées / disponibles",
    "Intervention réalisée et tests de bon fonctionnement effectués",
    "Équipement remis en service et état vérifié",
  ];

  checkItems.forEach((item) => {
    doc.setDrawColor(100, 100, 180);
    doc.roundedRect(MARGIN + 2, y - 3.5, 4, 4, 0.8, 0.8, "D");
    doc.setDrawColor(0);
    setFont("normal", 8.5);
    doc.setTextColor(40, 40, 60);
    text(item, MARGIN + 8, y);
    y += 7;
  });

  y += 4;

  // ── SECTION : RAPPORT DU TECHNICIEN ──────────────
  // Vérifier si on a besoin d'une nouvelle page
  const reportHeight = 80;
  if (y + reportHeight > 280) {
    doc.addPage();
    y = MARGIN;
  }

  y = sectionHeader("5. RAPPORT DU TECHNICIEN (à remplir)", y);

  // Champs à remplir à la main
  const reportFields = [
    { label: "Diagnostic confirmé :", lines: 2 },
    { label: "Actions effectuées :", lines: 3 },
    { label: "Pièces remplacées / matériaux utilisés :", lines: 2 },
    { label: "Temps d'intervention :", lines: 1 },
    { label: "Observations complémentaires :", lines: 2 },
  ];

  reportFields.forEach(({ label, lines }) => {
    setFont("bold", 8.5);
    doc.setTextColor(50, 50, 80);
    text(label, MARGIN + 2, y);
    y += 4;

    for (let i = 0; i < lines; i++) {
      doc.setDrawColor(160, 160, 180);
      doc.setLineWidth(0.3);
      doc.line(MARGIN + 2, y, W - MARGIN - 2, y);
      doc.setLineWidth(0.2);
      y += 6;
    }
    doc.setDrawColor(0);
    y += 3;
  });

  // ── SECTION : SIGNATURES ─────────────────────────
  const sigY = y + 4;
  if (sigY + 30 > 285) {
    doc.addPage();
    y = MARGIN;
  } else {
    y = sigY;
  }

  y = sectionHeader("6. SIGNATURES ET VALIDATION", y);

  const sigBoxW = COL / 3 - 4;
  const sigBoxH = 25;
  const sigPositions = [
    { label: "Technicien", x: MARGIN },
    { label: "Responsable maintenance", x: MARGIN + sigBoxW + 4 },
    { label: "Chef d'atelier", x: MARGIN + (sigBoxW + 4) * 2 },
  ];

  sigPositions.forEach(({ label, x }) => {
    doc.setDrawColor(160, 160, 180);
    doc.setFillColor(252, 252, 255);
    doc.roundedRect(x, y, sigBoxW, sigBoxH, 2, 2, "FD");
    doc.setDrawColor(0);
    setFont("bold", 7);
    doc.setTextColor(80, 80, 110);
    text(label, x + sigBoxW / 2, y + 4, { align: "center" });
    setFont("normal", 7);
    doc.setTextColor(140, 140, 160);
    text("Nom + Signature + Date", x + sigBoxW / 2, y + sigBoxH - 4, { align: "center" });
    doc.setTextColor(0, 0, 0);
  });

  y += sigBoxH + 10;

  // ── PIED DE PAGE ──────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.height;
    hrLine(pageH - 14, [200, 200, 210]);
    setFont("normal", 7);
    doc.setTextColor(150, 150, 160);
    text("Document confidentiel — Usage interne uniquement", MARGIN, pageH - 9);
    text(`Page ${p} / ${totalPages}`, W - MARGIN, pageH - 9, { align: "right" });
  }

  // ── TÉLÉCHARGEMENT ────────────────────────────────
  const safeName = (panne.titre ?? "panne").replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`fiche_intervention_${safeName}_${panne.id?.slice(-6) ?? "000"}.pdf`);
};

// ──────────────────────────────────────────────
// SUB-COMPONENTS (réutilisables)
// ──────────────────────────────────────────────
const StatusBadge = ({ statut, config }) => {
  const cfg = config?.[statut] ?? { label: statut, classes: "bg-gray-200 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
};

const PrioriteBadge = ({ priorite }) => {
  const cfg = PRIORITE_CONFIG[priorite] ?? PRIORITE_CONFIG.basse;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
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
const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ← NOUVEAU : icône téléchargement PDF
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

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
// PANNE MODAL (Add/Edit)
// ──────────────────────────────────────────────
const PanneModal = ({ onClose, onSaved, panne = null, equipements = [] }) => {
  const isEdit = !!panne;
  const [form, setForm] = useState({ 
    titre: panne?.titre || "", 
    description: panne?.description || "",
    equipement: panne?.equipement || "", 
    statut: panne?.statut || "nouvelle", 
    priorite: panne?.priorite || "moyenne",
    date_panne: panne?.date_panne?.split("T")[0] || new Date().toISOString().split("T")[0],
    date_resolution: panne?.date_resolution?.split("T")[0] || "",
    technicien: panne?.technicien || "",
    notes: panne?.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.titre.trim()) { setError("Le titre est requis."); return; }
    if (!form.equipement) { setError("Un équipement doit être sélectionné."); return; }
    
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.date_resolution) delete payload.date_resolution;
      if (!payload.technicien) delete payload.technicien;
      if (!payload.notes?.trim()) delete payload.notes;
      
      if (isEdit) {
        await pb.collection("pannes").update(panne.id, payload);
      } else {
        await pb.collection("pannes").create(payload);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-3 border-b">
          <h2 className="text-lg font-semibold text-slate-800">{isEdit ? "Modifier la panne" : "Déclarer une panne"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <XIcon />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Titre *</label>
            <input
              type="text"
              placeholder="ex: Fuite hydraulique pompe principale"
              value={form.titre}
              onChange={set("titre")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Équipement concerné *</label>
            <select
              value={form.equipement}
              onChange={set("equipement")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
            >
              <option value="">Sélectionner un équipement...</option>
              {equipements.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nom} {eq.zone ? `— ${eq.zone}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
              <select
                value={form.statut}
                onChange={set("statut")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
              >
                {Object.entries(STATUT_PANNE_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Priorité</label>
              <select
                value={form.priorite}
                onChange={set("priorite")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
              >
                {Object.entries(PRIORITE_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Date de la panne *</label>
              <input
                type="date"
                value={form.date_panne}
                onChange={set("date_panne")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Date de résolution</label>
              <input
                type="date"
                value={form.date_resolution}
                onChange={set("date_resolution")}
                className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Technicien assigné</label>
            <input
              type="text"
              placeholder="ex: Jean Dupont"
              value={form.technicien}
              onChange={set("technicien")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
            <textarea
              rows={3}
              placeholder="Décrire la panne, les symptômes, les actions déjà entreprises..."
              value={form.description}
              onChange={set("description")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes internes</label>
            <textarea
              rows={2}
              placeholder="Informations réservées à l'équipe maintenance..."
              value={form.notes}
              onChange={set("notes")}
              className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t">
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
            {isEdit ? "Modifier" : "Déclarer"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// CONFIRM DELETE MODAL
// ──────────────────────────────────────────────
const ConfirmDeleteModal = ({ onClose, onConfirm, itemName }) => (
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
// MAIN COMPONENT: Gestion des Pannes
// ──────────────────────────────────────────────
export default function Pannes() {
  const [pannes, setPannes]         = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPriorite, setFilterPriorite] = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modals state
  const [showPanneModal, setShowPanneModal] = useState(false);
  const [editPanne, setEditPanne] = useState(null);
  const [deletePanne, setDeletePanne] = useState(null);
  
  // Expand state for details
  const [expandedId, setExpandedId] = useState(null);

  // ← NOUVEAU : état pour le téléchargement en cours (ID de la panne)
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchWithRetry = async (fn, retries = 2, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  };

  const fetchEquipementsList = useCallback(async () => {
    try {
      const list = await fetchWithRetry(() =>
        pb.collection("equipements").getFullList({ sort: "nom" })
      );
      setEquipements(list);
    } catch (e) {
      console.warn("Impossible de charger la liste des équipements", e);
    }
  }, []);

  const fetchPannes = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const filters = [];
      if (search.trim()) filters.push(`titre ~ "${search}" || description ~ "${search}"`);
      if (filterStatut) filters.push(`statut = "${filterStatut}"`);
      if (filterPriorite) filters.push(`priorite = "${filterPriorite}"`);
      const filter = filters.join(" && ");

      const result = await fetchWithRetry(() =>
        pb.collection("pannes").getList(page, rowsPerPage, {
          sort: "-date_panne,-created",
          filter,
          expand: "equipement",
        })
      );

      setPannes(result.items);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les pannes. Vérifiez votre connexion PocketBase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterStatut, filterPriorite, page, rowsPerPage]);

  const handlePanneDelete = async () => {
    if (!deletePanne) return;
    try {
      await pb.collection("pannes").delete(deletePanne.id);
      fetchPannes({ silent: true });
      setDeletePanne(null);
      if (expandedId === deletePanne.id) setExpandedId(null);
    } catch (e) {
      setError("Erreur lors de la suppression : " + (e.message ?? "inconnue"));
    }
  };

  const refreshPannes = useCallback(() => fetchPannes({ silent: true }), [fetchPannes]);

  useEffect(() => { 
    fetchEquipementsList();
    fetchPannes(); 
  }, [fetchPannes, fetchEquipementsList]);

  useEffect(() => { setPage(1); }, [search, filterStatut, filterPriorite]);

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        unsub = await pb.collection("pannes").subscribe("*", () => {
          fetchPannes({ silent: true });
          setExpandedId(null);
        });
      } catch (_) {}
    })();
    return () => { if (unsub) unsub(); };
  }, [fetchPannes]);

  const from = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to   = Math.min(page * rowsPerPage, totalItems);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const formatDateTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return formatDate(iso) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const getEquipementName = (panne) => {
    if (panne.expand?.equipement?.nom) return panne.expand.equipement.nom;
    if (panne.equipement && typeof panne.equipement === "string") return "Équipement lié";
    return "Non assigné";
  };

  // ← NOUVEAU : gestionnaire de téléchargement PDF
  const handleDownloadFiche = async (panne) => {
    setDownloadingId(panne.id);
    try {
      await generateFicheTechnicien(panne, getEquipementName);
    } catch (e) {
      console.error("Erreur génération PDF :", e);
      setError("Impossible de générer le PDF : " + (e.message ?? "erreur inconnue"));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      {/* Modals */}
      {showPanneModal && (
        <PanneModal
          onClose={() => setShowPanneModal(false)}
          onSaved={refreshPannes}
          equipements={equipements}
        />
      )}
      {editPanne && (
        <PanneModal
          panne={editPanne}
          onClose={() => setEditPanne(null)}
          onSaved={refreshPannes}
          equipements={equipements}
        />
      )}
      {deletePanne && (
        <ConfirmDeleteModal
          itemName={deletePanne.titre}
          onClose={() => setDeletePanne(null)}
          onConfirm={handlePanneDelete}
        />
      )}

      <div className="p-4 bg-gray-50 max-h-screen font-sans rounded-xl">

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2 w-64 shadow-lg">
            <SearchIcon />
            <input
              type="text"
              placeholder="Recherche..."
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

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_PANNE_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value)}
            className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITE_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={() => fetchPannes({ silent: true })}
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
            onClick={() => setShowPanneModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <AlertIcon />
            Nouvelle panne
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
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">TITRE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ÉQUIPEMENT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">STATUT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PRIORITÉ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">DATE</th>
                {/* ← Colonne ACTIONS élargie pour accueillir le bouton PDF */}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7}><Spinner /></td></tr>
              ) : pannes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    Aucune panne déclarée.
                  </td>
                </tr>
              ) : (
                pannes.map((panne) => (
                  <Fragment key={panne.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => setExpandedId(expandedId === panne.id ? null : panne.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={expandedId === panne.id ? "Réduire" : "Voir détails"}
                        >
                          <ChevronRightIcon expanded={expandedId === panne.id} />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-800">{panne.titre}</div>
                        {panne.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{panne.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{getEquipementName(panne)}</td>
                      <td className="px-4 py-4"><StatusBadge statut={panne.statut} config={STATUT_PANNE_CONFIG} /></td>
                      <td className="px-4 py-4"><PrioriteBadge priorite={panne.priorite} /></td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(panne.date_panne)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* ← NOUVEAU : bouton télécharger fiche PDF */}
                          <button
                            onClick={() => handleDownloadFiche(panne)}
                            disabled={downloadingId === panne.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Télécharger la fiche technicien (PDF)"
                          >
                            {downloadingId === panne.id
                              ? <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                              : <DownloadIcon />
                            }
                          </button>
                          <button
                            onClick={() => setEditPanne(panne)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeletePanne(panne)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable details row */}
                    {expandedId === panne.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-gradient-to-r from-red-50/60 to-orange-50/30">
                          <div className="pl-10 border-l-2 border-red-300 ml-3 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Technicien</span>
                                <p className="text-slate-700 mt-1">{panne.technicien || "—"}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Résolution</span>
                                <p className="text-slate-700 mt-1">{panne.date_resolution ? formatDate(panne.date_resolution) : "En cours"}</p>
                              </div>
                            </div>
                            
                            {panne.description && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Description complète</span>
                                <p className="text-slate-700 mt-1 whitespace-pre-wrap">{panne.description}</p>
                              </div>
                            )}
                            
                            {panne.notes && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <span className="text-xs font-semibold text-amber-700 uppercase">Notes internes</span>
                                <p className="text-amber-900 mt-1 text-sm whitespace-pre-wrap">{panne.notes}</p>
                              </div>
                            )}

                            {/* ← NOUVEAU : bouton PDF dans la zone détails aussi */}
                            <div className="flex items-center gap-2 pt-1 border-t border-red-100">
                              <button
                                onClick={() => handleDownloadFiche(panne)}
                                disabled={downloadingId === panne.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {downloadingId === panne.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  : <DownloadIcon />
                                }
                                Télécharger la fiche technicien (PDF)
                              </button>
                              <span className="text-xs text-gray-400">
                                Créée le {formatDateTime(panne.created)} • Modifiée le {formatDateTime(panne.updated)}
                              </span>
                            </div>
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
          <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-gray-300 text-sm text-gray-500">
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
