import { useState, useEffect, useCallback, Fragment } from "react";
import PocketBase from "pocketbase";

// ──────────────────────────────────────────────
// CONFIG — PocketBase instance
// ──────────────────────────────────────────────
const pb = new PocketBase("http://127.0.0.1:8090");

// ──────────────────────────────────────────────
// STATUT CONFIG pour les ordres de travail (avec couleurs RGB Tailwind pour le PDF)
// ──────────────────────────────────────────────
const STATUT_OT_CONFIG = {
  brouillon:    { label: "Brouillon",     classes: "bg-gray-400 text-white",   rgb: [156, 163, 175], textRgb: [255, 255, 255] },
  planifie:     { label: "Planifié",      classes: "bg-blue-500 text-white",   rgb: [59, 130, 246],  textRgb: [255, 255, 255] },
  en_cours:     { label: "En cours",      classes: "bg-amber-500 text-white",  rgb: [245, 158, 11],  textRgb: [255, 255, 255] },
  en_attente:   { label: "En attente",    classes: "bg-purple-500 text-white", rgb: [168, 85, 247],  textRgb: [255, 255, 255] },
  termine:      { label: "Terminé",       classes: "bg-green-500 text-white",  rgb: [34, 197, 94],   textRgb: [255, 255, 255] },
  annule:       { label: "Annulé",        classes: "bg-red-500 text-white",    rgb: [239, 68, 68],   textRgb: [255, 255, 255] },
};

const PRIORITE_CONFIG = {
  basse:   { label: "Basse",   classes: "bg-gray-200 text-gray-700",   rgb: [229, 231, 235], textRgb: [55, 65, 81] },
  moyenne: { label: "Moyenne", classes: "bg-amber-200 text-amber-800", rgb: [253, 230, 138], textRgb: [146, 64, 14] },
  haute:   { label: "Haute",   classes: "bg-orange-400 text-white",    rgb: [251, 146, 60],  textRgb: [255, 255, 255] },
  critique:{ label: "Critique",classes: "bg-red-600 text-white",       rgb: [220, 38, 38],   textRgb: [255, 255, 255] },
};

const TYPE_OT_CONFIG = {
  correctif:   { label: "Correctif",   classes: "bg-red-100 text-red-700",     rgb: [254, 226, 226], textRgb: [185, 28, 28] },
  preventif:   { label: "Préventif",   classes: "bg-blue-100 text-blue-700",   rgb: [219, 234, 254], textRgb: [29, 78, 216] },
  amelioratif: { label: "Amélioratif", classes: "bg-purple-100 text-purple-700", rgb: [243, 232, 255], textRgb: [126, 34, 206] },
  urgent:      { label: "Urgent",      classes: "bg-rose-100 text-rose-700",   rgb: [255, 228, 230], textRgb: [190, 18, 60] },
};

// ──────────────────────────────────────────────
// PDF EXPORT — génère le rapport OT avec jsPDF
// ──────────────────────────────────────────────
const generateOTPDF = async (ot, getEquipementName, getPanneTitle) => {
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

  // Configs
  const statutCfg = STATUT_OT_CONFIG[ot.statut] ?? { label: ot.statut ?? "—" };
  const statutLabel = statutCfg.label ?? ot.statut ?? "—";
  const prioriteCfg = PRIORITE_CONFIG[ot.priorite] ?? { label: ot.priorite ?? "—" };
  const prioriteLabel = prioriteCfg.label ?? ot.priorite ?? "—";
  const typeCfg = TYPE_OT_CONFIG[ot.type] ?? { label: ot.type ?? "—" };
  const typeLabel = typeCfg.label ?? ot.type ?? "—";

  const equipementNom = getEquipementName(ot);
  const panneTitre = getPanneTitle(ot);

  // Couleur statut
  const statutColor = {
    ouvert:        [66, 120, 220],
    en_cours:      [210, 150, 30],
    en_pause:      [180, 100, 180],
    termine:       [40, 160, 80],
    annule:        [180, 30, 30],
  }[ot.statut] ?? [100, 100, 100];

  // Couleur priorité
  const prioriteColor = {
    basse:    [100, 120, 100],
    moyenne:  [180, 120, 30],
    haute:    [210, 100, 30],
    critique: [200, 40, 40],
  }[ot.priorite] ?? [100, 100, 100];

  // Couleur type
  const typeColor = {
    correctif:  [220, 100, 50],
    preventif:  [60, 140, 200],
    amelioratif:[150, 80, 180],
    urgent:     [200, 40, 40],
  }[ot.type] ?? [100, 100, 100];

  // ── EN-TÊTE ───────────────────────────────────
  y = MARGIN;

  // Bandeau gris foncé
  doc.setFillColor(35, 38, 48);
  doc.roundedRect(MARGIN, y, COL, 22, 3, 3, "F");

  setFont("bold", 16);
  doc.setTextColor(255, 255, 255);
  text("ORDRE DE TRAVAIL (OT)", MARGIN + 6, y + 10);

  setFont("normal", 8);
  doc.setTextColor(180, 185, 200);
  const now = new Date();
  text(
      `Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
      MARGIN + 6,
      y + 17
  );

  // Référence OT (coin droit)
  setFont("bold", 8);
  doc.setTextColor(200, 205, 220);
  text(`Réf. OT : ${ot.reference ?? "—"}`, W - MARGIN - 6, y + 10, { align: "right" });

  doc.setTextColor(0, 0, 0);
  y += 28;

  // ── TITRE DE L'OT ─────────────────────────
  setFont("bold", 14);
  doc.setTextColor(20, 20, 60);
  y = wrapText(ot.titre ?? "Sans titre", MARGIN, y, COL, 7);
  doc.setTextColor(0, 0, 0);
  y += 2;

  // Badges statut + priorité + type inline
  const badgeY = y;

  // Statut
  doc.setFillColor(...statutColor);
  doc.roundedRect(MARGIN, badgeY, 32, 6, 1.5, 1.5, "F");
  setFont("bold", 7);
  doc.setTextColor(255, 255, 255);
  text(statutLabel.toUpperCase(), MARGIN + 16, badgeY + 4.2, { align: "center" });

  // Priorité
  doc.setFillColor(...prioriteColor);
  doc.roundedRect(MARGIN + 34, badgeY, 28, 6, 1.5, 1.5, "F");
  text(prioriteLabel.toUpperCase(), MARGIN + 48, badgeY + 4.2, { align: "center" });

  // Type
  doc.setFillColor(...typeColor);
  doc.roundedRect(MARGIN + 64, badgeY, 30, 6, 1.5, 1.5, "F");
  text(typeLabel.toUpperCase(), MARGIN + 79, badgeY + 4.2, { align: "center" });

  doc.setTextColor(0, 0, 0);
  y += 12;
  hrLine(y, [220, 220, 220]);
  y += 6;

  // ── SECTION : IDENTIFICATION & ÉQUIPEMENT ─────────
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

  y = sectionHeader("1. IDENTIFICATION & ÉQUIPEMENT", y);

  const C1 = MARGIN;
  const C2 = MARGIN + COL / 2 + 3;
  const CW = COL / 2 - 3;

  fieldRow("Équipement concerné", equipementNom, C1, y, CW);
  fieldRow("Panne liée", panneTitre, C2, y, CW);
  y += 12;

  fieldRow("Date de création", formatDate(ot.date_creation || ot.created), C1, y, CW);
  fieldRow("Dernière modification", formatDateTime(ot.updated), C2, y, CW);
  y += 14;

  // ── SECTION : PLANNING & RESSOURCES ──────────────
  y = sectionHeader("2. PLANNING & RESSOURCES", y);

  // 3 colonnes
  const col3W = COL / 3 - 2;
  const C3_1 = MARGIN;
  const C3_2 = MARGIN + col3W + 3;
  const C3_3 = MARGIN + (col3W + 3) * 2;

  fieldRow("Date début", formatDate(ot.date_debut), C3_1, y, col3W);
  fieldRow("Fin prévue", formatDate(ot.date_fin_prevue), C3_2, y, col3W);
  fieldRow("Fin réelle", formatDate(ot.date_fin_reelle), C3_3, y, col3W);
  y += 12;

  fieldRow("Technicien", ot.technicien || "Non assigné", C3_1, y, col3W);
  fieldRow("Équipe", ot.equipe || "—", C3_2, y, col3W);

  const tempsLabel = (ot.temps_estime && ot.temps_reel)
      ? `${ot.temps_estime}h estimé / ${ot.temps_reel}h réel`
      : ot.temps_estime ? `${ot.temps_estime}h estimé`
          : ot.temps_reel ? `${ot.temps_reel}h réel` : "—";
  fieldRow("Temps (estimé / réel)", tempsLabel, C3_3, y, col3W);
  y += 14;

  // ── SECTION : DESCRIPTION ──────────────────────
  if (ot.description?.trim()) {
    y = sectionHeader("3. DESCRIPTION", y);
    setFont("normal", 9);
    y = wrapText(ot.description, MARGIN + 2, y, COL - 4, 5.5);
    y += 6;
  }

  // ── SECTION : INSTRUCTIONS TECHNIQUES ──────────
  if (ot.instructions?.trim()) {
    if (y + 40 > 280) {
      doc.addPage();
      y = MARGIN;
    }

    y = sectionHeader("4. INSTRUCTIONS TECHNIQUES", y);

    doc.setFillColor(248, 250, 252);
    const instrLines = doc.splitTextToSize(ot.instructions, COL - 10);
    const instrH = instrLines.length * 5 + 8;
    doc.roundedRect(MARGIN, y, COL, instrH, 2, 2, "F");
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN, y, COL, instrH, 2, 2, "D");
    doc.setDrawColor(0);

    setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(instrLines, MARGIN + 5, y + 6);
    doc.setTextColor(0, 0, 0);
    y += instrH + 8;
  }

  // ── SECTION : NOTES DE CLÔTURE ─────────────────
  if (ot.notes_cloture?.trim()) {
    if (y + 30 > 280) {
      doc.addPage();
      y = MARGIN;
    }

    y = sectionHeader("5. NOTES DE CLÔTURE", y);

    doc.setFillColor(240, 253, 244);
    const noteLines = doc.splitTextToSize(ot.notes_cloture, COL - 10);
    const noteH = noteLines.length * 5 + 8;
    doc.roundedRect(MARGIN, y, COL, noteH, 2, 2, "F");
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(MARGIN, y, COL, noteH, 2, 2, "D");
    doc.setDrawColor(0);

    setFont("normal", 9);
    doc.setTextColor(21, 128, 61);
    doc.text(noteLines, MARGIN + 5, y + 6);
    doc.setTextColor(0, 0, 0);
    y += noteH + 8;
  }

  // ── SECTION : SIGNATURES ──────────────────────
  const sigY = y + 4;
  if (sigY + 30 > 285) {
    doc.addPage();
    y = MARGIN;
  } else {
    y = sigY;
  }

  y = sectionHeader("6. SIGNATURES ET VALIDATION", y);

  const sigBoxW = COL / 2 - 4;
  const sigBoxH = 25;
  const sigPositions = [
    { label: "Technicien / Agent", x: MARGIN },
    { label: "Responsable", x: MARGIN + sigBoxW + 8 },
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

  // ── PIED DE PAGE ──────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.height;
    hrLine(pageH - 14, [200, 200, 210]);
    setFont("normal", 7);
    doc.setTextColor(150, 150, 160);
    text("MaintOrg", MARGIN, pageH - 9);
    text(`Page ${p} / ${totalPages}`, W - MARGIN, pageH - 9, { align: "right" });
  }

  // ── TÉLÉCHARGEMENT ────────────────────────────
  const safeRef = (ot.reference ?? "OT").replace(/[^a-z0-9]/gi, "_").slice(0, 30);
  doc.save(`OT_${safeRef}_${new Date().toISOString().split("T")[0]}.pdf`);
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

const TypeBadge = ({ type }) => {
  const cfg = TYPE_OT_CONFIG[type] ?? TYPE_OT_CONFIG.correctif;
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
const ClipboardIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
);
const ClockIcon = () => (
    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
);
const UserIcon = () => (
    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);

// ── NOUVEAU : Icône téléchargement PDF ──────────
const DownloadIcon = ({ spinning }) => (
    spinning
        ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round"/>
        </svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
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
// ORDRE DE TRAVAIL MODAL (Add/Edit)
// ──────────────────────────────────────────────
const OTModal = ({ onClose, onSaved, ot = null, equipements = [], pannes = [], pieces = [] }) => {
  const isEdit = !!ot;
  const [form, setForm] = useState({
    reference: ot?.reference || `OT-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`,
    titre: ot?.titre || "",
    type: ot?.type || "correctif",
    equipement: ot?.equipement || "",
    panne_liee: ot?.panne_liee || "",
    statut: ot?.statut || "brouillon",
    priorite: ot?.priorite || "moyenne",
    date_creation: ot?.date_creation?.split("T")[0] || new Date().toISOString().split("T")[0],
    date_debut: ot?.date_debut?.split("T")[0] || "",
    date_fin_prevue: ot?.date_fin_prevue?.split("T")[0] || "",
    date_fin_reelle: ot?.date_fin_reelle?.split("T")[0] || "",
    technicien: ot?.technicien || "",
    equipe: ot?.equipe || "",
    temps_estime: ot?.temps_estime || "",
    temps_reel: ot?.temps_reel || "",
    description: ot?.description || "",
    instructions: ot?.instructions || "",
    pieces_utilisees: ot?.pieces_utilisees || [],
    notes_cloture: ot?.notes_cloture || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedPieces, setSelectedPieces] = useState(form.pieces_utilisees || []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const togglePiece = (pieceId) => {
    setSelectedPieces(prev =>
        prev.includes(pieceId)
            ? prev.filter(id => id !== pieceId)
            : [...prev, pieceId]
    );
  };

  const handleSubmit = async () => {
    if (!form.titre.trim()) { setError("Le titre est requis."); return; }
    if (!form.equipement) { setError("Un équipement doit être sélectionné."); return; }

    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        pieces_utilisees: selectedPieces
      };

      Object.keys(payload).forEach(key => {
        if (!payload[key] && key !== "pieces_utilisees") delete payload[key];
      });

      if (isEdit) {
        await pb.collection("ordresdetravail").update(ot.id, payload);
      } else {
        await pb.collection("ordresdetravail").create(payload);
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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pb-3 border-b">
            <h2 className="text-lg font-semibold text-slate-800">{isEdit ? "Modifier l'OT" : "Nouvel ordre de travail"}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <XIcon />
            </button>
          </div>

          {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Référence</label>
                <input type="text" value={form.reference} onChange={set("reference")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition font-mono" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Titre *</label>
                <input type="text" placeholder="ex: Remplacement joint hydraulique" value={form.titre} onChange={set("titre")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Équipement *</label>
                <select value={form.equipement} onChange={set("equipement")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white">
                  <option value="">Sélectionner...</option>
                  {equipements.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.nom} {eq.zone ? `— ${eq.zone}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Panne liée (optionnel)</label>
                <select value={form.panne_liee} onChange={set("panne_liee")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white">
                  <option value="">Aucune</option>
                  {pannes.filter(p => !p.equipement || p.equipement === form.equipement).map((panne) => (
                      <option key={panne.id} value={panne.id}>{panne.titre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Type</label>
                <select value={form.type} onChange={set("type")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white">
                  {Object.entries(TYPE_OT_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Statut</label>
                <select value={form.statut} onChange={set("statut")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white">
                  {Object.entries(STATUT_OT_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Priorité</label>
                <select value={form.priorite} onChange={set("priorite")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white">
                  {Object.entries(PRIORITE_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Création</label>
                <input type="date" value={form.date_creation} onChange={set("date_creation")} disabled
                       className="w-full border border-gray-300 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Début</label>
                <input type="date" value={form.date_debut} onChange={set("date_debut")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Fin prévue</label>
                <input type="date" value={form.date_fin_prevue} onChange={set("date_fin_prevue")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Fin réelle</label>
                <input type="date" value={form.date_fin_reelle} onChange={set("date_fin_reelle")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Technicien</label>
                <input type="text" placeholder="ex: Jean D." value={form.technicien} onChange={set("technicien")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Équipe</label>
                <input type="text" placeholder="ex: Maintenance A" value={form.equipe} onChange={set("equipe")}
                       className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Estimé (h)</label>
                  <input type="number" min="0" step="0.5" value={form.temps_estime} onChange={set("temps_estime")}
                         className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Réel (h)</label>
                  <input type="number" min="0" step="0.5" value={form.temps_reel} onChange={set("temps_reel")}
                         className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Description</label>
              <textarea rows={2} placeholder="Contexte et objectif de l'intervention..." value={form.description} onChange={set("description")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Instructions techniques</label>
              <textarea rows={3} placeholder="Procédure, consignes de sécurité, outils nécessaires..." value={form.instructions} onChange={set("instructions")}
                        className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none font-mono text-xs" />
            </div>

            {pieces.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Pièces à prévoir</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-xl bg-gray-50">
                    {pieces.map((piece) => (
                        <label key={piece.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                            selectedPieces.includes(piece.id)
                                ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                                : "bg-white border-gray-300 text-gray-600 hover:border-indigo-200"
                        }`}>
                          <input type="checkbox" checked={selectedPieces.includes(piece.id)} onChange={() => togglePiece(piece.id)} className="rounded" />
                          {piece.nom}
                        </label>
                    ))}
                  </div>
                </div>
            )}

            {form.statut === "termine" && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes de clôture</label>
                  <textarea rows={2} placeholder="Résultats, observations, recommandations..." value={form.notes_cloture} onChange={set("notes_cloture")}
                            className="w-full border border-gray-600 text-black bg-gray rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none" />
                </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <PlusIcon />}
              {isEdit ? "Modifier" : "Créer"}
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-2">
            <TrashIcon /> Supprimer
          </button>
        </div>
      </div>
    </div>
);

// ──────────────────────────────────────────────
// MAIN COMPONENT: Gestion des Ordres de Travail
// ──────────────────────────────────────────────
export default function OrdresTravail() {
  const [ots, setOts]                     = useState([]);
  const [equipements, setEquipements]     = useState([]);
  const [pannes, setPannes]               = useState([]);
  const [pieces, setPieces]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [filterStatut, setFilterStatut]   = useState("");
  const [filterPriorite, setFilterPriorite] = useState("");
  const [filterType, setFilterType]       = useState("");
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [totalItems, setTotalItems]       = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(10);

  // Modals state
  const [showOTModal, setShowOTModal] = useState(false);
  const [editOT, setEditOT] = useState(null);
  const [deleteOT, setDeleteOT] = useState(null);

  // Expand state
  const [expandedId, setExpandedId] = useState(null);

  // ── NOUVEAU : état de génération PDF par OT ──
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const fetchWithRetry = async (fn, retries = 2, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  const fetchReferenceData = useCallback(async () => {
    try {
      const [eq, pn, pc] = await fetchWithRetry(() =>
          Promise.all([
            pb.collection("equipements").getFullList({ sort: "nom" }),
            pb.collection("pannes").getFullList({
              sort: "-date_panne",
              filter: "statut != 'resolue'",
            }),
            pb.collection("pieces").getFullList({ sort: "nom" }),
          ])
      );
      setEquipements(eq);
      setPannes(pn);
      setPieces(pc);
    } catch (e) {
      console.warn("Erreur chargement données de référence", e);
    }
  }, []);

  const fetchOTs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const filters = [];
      if (search.trim()) {
        filters.push(`titre ~ "${search}" || reference ~ "${search}" || description ~ "${search}"`);
      }
      if (filterStatut) filters.push(`statut = "${filterStatut}"`);
      if (filterPriorite) filters.push(`priorite = "${filterPriorite}"`);
      if (filterType) filters.push(`type = "${filterType}"`);
      const filter = filters.length > 0 ? filters.join(" && ") : "";
      const result = await fetchWithRetry(() =>
          pb.collection("ordresdetravail").getList(page, rowsPerPage, {
            sort: "-date_creation,-created",
            filter,
            expand: "equipement,panne_liee",
          })
      );
      setOts(result.items);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les ordres de travail.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterStatut, filterPriorite, filterType, page, rowsPerPage]);

  const handleOTDelete = async () => {
    if (!deleteOT) return;
    try {
      await pb.collection("ordresdetravail").delete(deleteOT.id);
      fetchOTs({ silent: true });
      setDeleteOT(null);
      if (expandedId === deleteOT.id) setExpandedId(null);
    } catch (e) {
      setError("Erreur suppression : " + (e.message ?? "inconnue"));
    }
  };

  const refreshOTs = useCallback(() => fetchOTs({ silent: true }), [fetchOTs]);

  useEffect(() => {
    fetchReferenceData();
    fetchOTs();
  }, [fetchOTs, fetchReferenceData]);

  useEffect(() => { setPage(1); }, [search, filterStatut, filterPriorite, filterType]);

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        unsub = await pb.collection("ordresdetravail").subscribe("*", () => {
          fetchOTs({ silent: true });
          setExpandedId(null);
        });
      } catch (_) {}
    })();
    return () => { if (unsub) unsub(); };
  }, [fetchOTs]);

  const from = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const to   = Math.min(page * rowsPerPage, totalItems);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const getEquipementName = (ot) => ot.expand?.equipement?.nom || (ot.equipement ? "Équipement lié" : "—");
  const getPanneTitle = (ot) => ot.expand?.panne_liee?.titre || (ot.panne_liee ? "Panne liée" : "—");

  const getDelaiInfo = (ot) => {
    if (!ot.date_fin_prevue || ot.statut === "termine") return null;
    const today = new Date();
    const deadline = new Date(ot.date_fin_prevue);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `${Math.abs(diff)}j de retard`, class: "text-red-600 font-semibold" };
    if (diff === 0) return { text: "Aujourd'hui", class: "text-amber-600 font-semibold" };
    return { text: `${diff}j restants`, class: "text-gray-500" };
  };

  // ── NOUVEAU : handler export PDF ─────────────
  const handleExportPDF = async (ot) => {
    setPdfLoadingId(ot.id);
    try {
      await generateOTPDF(ot, getEquipementName, getPanneTitle);
    } catch (e) {
      console.error("Erreur génération PDF :", e);
      setError("Erreur lors de la génération du PDF : " + (e.message ?? "inconnue"));
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
      <>
        {/* Modals */}
        {showOTModal && (
            <OTModal onClose={() => setShowOTModal(false)} onSaved={refreshOTs} equipements={equipements} pannes={pannes} pieces={pieces} />
        )}
        {editOT && (
            <OTModal ot={editOT} onClose={() => setEditOT(null)} onSaved={refreshOTs} equipements={equipements} pannes={pannes} pieces={pieces} />
        )}
        {deleteOT && (
            <ConfirmDeleteModal itemName={deleteOT.reference} itemType="ordre de travail" onClose={() => setDeleteOT(null)} onConfirm={handleOTDelete} />
        )}

        <div className="p-4 bg-gray-50 max-h-screen font-sans rounded-xl">

          {/* Top bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2 w-64 shadow-lg">
              <SearchIcon />
              <input type="text" placeholder="Recherche OT..." value={search} onChange={(e) => setSearch(e.target.value)}
                     className="outline-none text-sm text-gray-700 bg-transparent w-full placeholder-gray-400" />
              {search && <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600"><XIcon /></button>}
            </div>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tous types</option>
              {Object.entries(TYPE_OT_CONFIG).map(([k,{label}]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                    className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tous statuts</option>
              {Object.entries(STATUT_OT_CONFIG).map(([k,{label}]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)}
                    className="border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Toutes priorités</option>
              {Object.entries(PRIORITE_CONFIG).map(([k,{label}]) => <option key={k} value={k}>{label}</option>)}
            </select>

            <div className="flex-1" />

            <button onClick={() => fetchOTs({ silent: true })} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100" title="Rafraîchir">
              <RefreshIcon spinning={refreshing} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"><DotsIcon /></button>
            <button onClick={() => setShowOTModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <ClipboardIcon /> Nouvel OT
            </button>
          </div>

          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-300 overflow-hidden shadow-lg">
            <table className="w-full">
              <thead className="bg-gray-100">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">RÉF / TITRE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ÉQUIPEMENT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">TYPE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">STATUT</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">PRIORITÉ</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ÉCHÉANCE</th>
                {/* Colonne ACTIONS élargie pour accueillir le bouton PDF */}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-32">ACTIONS</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={8}><Spinner /></td></tr> : ots.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Aucun ordre de travail trouvé.</td></tr>
              ) : (
                  ots.map((ot) => {
                    const delai = getDelaiInfo(ot);
                    const isPdfLoading = pdfLoadingId === ot.id;
                    return (
                        <Fragment key={ot.id}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <button onClick={() => setExpandedId(expandedId === ot.id ? null : ot.id)} className="p-1 hover:bg-gray-100 rounded">
                                <ChevronRightIcon expanded={expandedId === ot.id} />
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-mono font-semibold text-indigo-700">{ot.reference}</div>
                              <div className="text-sm font-medium text-slate-800">{ot.titre}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">{getEquipementName(ot)}</td>
                            <td className="px-4 py-4"><TypeBadge type={ot.type} /></td>
                            <td className="px-4 py-4"><StatusBadge statut={ot.statut} config={STATUT_OT_CONFIG} /></td>
                            <td className="px-4 py-4"><PrioriteBadge priorite={ot.priorite} /></td>
                            <td className="px-4 py-4 text-sm">
                              <div className="flex items-center gap-1">
                                <ClockIcon />
                                <span className={delai?.class || "text-gray-500"}>{delai?.text || formatDate(ot.date_fin_prevue) || "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1 justify-end">
                                {/* ── NOUVEAU : Bouton téléchargement PDF ── */}
                                <button
                                    onClick={() => handleExportPDF(ot)}
                                    disabled={isPdfLoading}
                                    title="Télécharger le rapport PDF"
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                  <DownloadIcon spinning={isPdfLoading} />
                                </button>
                                <button onClick={() => setEditOT(ot)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><EditIcon /></button>
                                <button onClick={() => setDeleteOT(ot)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon /></button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded details */}
                          {expandedId === ot.id && (
                              <tr>
                                <td colSpan={8} className="px-4 py-3 bg-gradient-to-r from-emerald-50/60 to-blue-50/30">
                                  <div className="pl-10 border-l-2 border-emerald-300 ml-3 space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><UserIcon /> Technicien</span>
                                        <p className="text-slate-700 mt-1">{ot.technicien || "—"}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Équipe</span>
                                        <p className="text-slate-700 mt-1">{ot.equipe || "—"}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Temps estimé</span>
                                        <p className="text-slate-700 mt-1">{ot.temps_estime ? `${ot.temps_estime}h` : "—"}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Temps réel</span>
                                        <p className="text-slate-700 mt-1">{ot.temps_reel ? `${ot.temps_reel}h` : "—"}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm bg-white rounded-xl p-3 border">
                                      <div><span className="text-xs text-gray-500">Début</span><p className="font-medium">{formatDate(ot.date_debut) || "—"}</p></div>
                                      <div><span className="text-xs text-gray-500">Fin prévue</span><p className="font-medium">{formatDate(ot.date_fin_prevue) || "—"}</p></div>
                                      <div><span className="text-xs text-gray-500">Fin réelle</span><p className="font-medium">{formatDate(ot.date_fin_reelle) || "—"}</p></div>
                                    </div>

                                    {ot.description && (
                                        <div>
                                          <span className="text-xs font-semibold text-gray-500 uppercase">Description</span>
                                          <p className="text-slate-700 mt-1">{ot.description}</p>
                                        </div>
                                    )}

                                    {ot.instructions && (
                                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                                          <span className="text-xs font-semibold text-gray-600 uppercase">Instructions</span>
                                          <pre className="text-slate-700 mt-1 text-xs whitespace-pre-wrap font-mono">{ot.instructions}</pre>
                                        </div>
                                    )}

                                    {ot.panne_liee && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <span className="text-xs font-semibold text-gray-500 uppercase">Panne liée:</span>
                                          <span className="text-indigo-600">{getPanneTitle(ot)}</span>
                                        </div>
                                    )}

                                    {ot.notes_cloture && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <span className="text-xs font-semibold text-green-700 uppercase">Clôture</span>
                                          <p className="text-green-900 mt-1 text-sm">{ot.notes_cloture}</p>
                                        </div>
                                    )}

                                    {/* ── NOUVEAU : Bouton PDF dans le détail déplié ── */}
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                      <button
                                          onClick={() => handleExportPDF(ot)}
                                          disabled={isPdfLoading}
                                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                      >
                                        <DownloadIcon spinning={pdfLoadingId === ot.id} />
                                        Télécharger le rapport PDF
                                      </button>
                                      <span className="text-xs text-gray-400">
                                  Créé le {formatDate(ot.created)} • Modifié le {formatDate(ot.updated)}
                                </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                          )}
                        </Fragment>
                    );
                  })
              )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-4 px-5 py-3 border-t border-gray-300 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                        className="outline-none text-gray-700 font-medium bg-transparent border border-gray-300 rounded px-2 py-1">
                  {[5,10,20,40].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <span className="font-medium text-gray-700">{totalItems === 0 ? "0 résultats" : `${from}–${to} sur ${totalItems}`}</span>
              <div className="flex items-center gap-1">
                <NavBtn onClick={() => setPage(1)} disabled={page===1} d="11 17 6 12 11 7" />
                <NavBtn onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} d="15 18 9 12 15 6" />
                <NavBtn onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages||totalPages===0} d="9 18 15 12 9 6" />
                <NavBtn onClick={() => setPage(totalPages)} disabled={page>=totalPages||totalPages===0} d="13 17 18 12 13 7" />
              </div>
            </div>
          </div>
        </div>
      </>
  );
}