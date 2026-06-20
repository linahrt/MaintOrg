
"""
Générateur de données de test réalistes pour une usine de café
CMMS - PocketBase
Usage: python generate_data.py
"""

import requests
import json
import random
from datetime import datetime, timedelta

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
PB_URL = "http://127.0.0.1:8090"
ADMIN_EMAIL = "linahrt@protonmail.com"
ADMIN_PASSWORD = "pocketbasepassword"

# ─────────────────────────────────────────────
# DONNÉES MÉTIER - USINE DE CAFÉ
# ─────────────────────────────────────────────

TECHNICIENS = [
    "Karim Bensalem", "Mohamed Tahar", "Rachid Ouali",
    "Aissa Khelifi", "Nassim Benali",
]
EQUIPES = ["Équipe A (matin)", "Équipe B (après-midi)", "Équipe C (nuit)", "Équipe maintenance"]

EQUIPEMENTS_DATA = [
    {"nom": "Trémie de réception café vert",        "zone": "Réception",       "modele": "TR-2000",          "has_children": False},
    {"nom": "Silo de stockage café vert #1",         "zone": "Stockage",        "modele": "SILO-50T",         "has_children": False},
    {"nom": "Silo de stockage café vert #2",         "zone": "Stockage",        "modele": "SILO-50T",         "has_children": False},
    {"nom": "Convoyeur à vis #1",                    "zone": "Stockage",        "modele": "CVA-300",          "has_children": False},
    {"nom": "Convoyeur à vis #2",                    "zone": "Stockage",        "modele": "CVA-300",          "has_children": False},
    {"nom": "Machine de nettoyage (dépoussiérage)",  "zone": "Prétraitement",   "modele": "CLN-800",          "has_children": False},
    {"nom": "Trieur optique couleur",                "zone": "Prétraitement",   "modele": "SORTEX-Z+",        "has_children": False},
    {"nom": "Dénoyauteur / déshabilleur",            "zone": "Prétraitement",   "modele": "DH-450",           "has_children": False},
    {"nom": "Torréfacteur industriel #1",            "zone": "Torréfaction",    "modele": "PROBAT G90",       "has_children": True},
    {"nom": "Torréfacteur industriel #2",            "zone": "Torréfaction",    "modele": "PROBAT G90",       "has_children": True},
    {"nom": "Torréfacteur industriel #3 (réserve)",  "zone": "Torréfaction",    "modele": "LORING S35",       "has_children": False},
    {"nom": "Refroidisseur de café torréfié #1",     "zone": "Torréfaction",    "modele": "RFC-900",          "has_children": False},
    {"nom": "Refroidisseur de café torréfié #2",     "zone": "Torréfaction",    "modele": "RFC-900",          "has_children": False},
    {"nom": "Afterburner / post-combustion",         "zone": "Torréfaction",    "modele": "AFB-200",          "has_children": False},
    {"nom": "Moulin industriel #1",                  "zone": "Mouture",         "modele": "BUNN MHG",         "has_children": False},
    {"nom": "Moulin industriel #2",                  "zone": "Mouture",         "modele": "BUNN MHG",         "has_children": False},
    {"nom": "Moulin espresso fin #1",                "zone": "Mouture",         "modele": "MAZZER KOLD",      "has_children": False},
    {"nom": "Tamiseur vibrant",                      "zone": "Mouture",         "modele": "TVB-600",          "has_children": False},
    {"nom": "Machine de dosage & remplissage #1",    "zone": "Conditionnement", "modele": "OPTIMA VF",        "has_children": True},
    {"nom": "Machine de dosage & remplissage #2",    "zone": "Conditionnement", "modele": "OPTIMA VF",        "has_children": False},
    {"nom": "Soudeuse thermique",                    "zone": "Conditionnement", "modele": "SLD-1200",         "has_children": False},
    {"nom": "Machine de mise sous vide",             "zone": "Conditionnement", "modele": "MULTIVAC R230",    "has_children": False},
    {"nom": "Injecteuse d'azote (flush N2)",         "zone": "Conditionnement", "modele": "N2-FLUSH-PRO",     "has_children": False},
    {"nom": "Étiqueteuse automatique",               "zone": "Conditionnement", "modele": "HERMA H400",       "has_children": False},
    {"nom": "Fardeleur / emballeuse fardeau",        "zone": "Conditionnement", "modele": "SIRO-FAR80",       "has_children": False},
    {"nom": "Compresseur d'air industriel #1",       "zone": "Utilités",        "modele": "ATLAS COPCO GA15", "has_children": False},
    {"nom": "Compresseur d'air industriel #2",       "zone": "Utilités",        "modele": "ATLAS COPCO GA15", "has_children": False},
    {"nom": "Chaudière vapeur",                      "zone": "Utilités",        "modele": "CHAROT VS-200",    "has_children": False},
    {"nom": "Groupe électrogène de secours",         "zone": "Utilités",        "modele": "CUMMINS C150D5",   "has_children": False},
    {"nom": "Système de dépoussiérage centralisé",   "zone": "Utilités",        "modele": "NEDERMAN MDB",     "has_children": False},
    {"nom": "Centrale de traitement d'eau",          "zone": "Utilités",        "modele": "AQUAPUR 5000",     "has_children": False},
]

PIECES_PAR_ZONE = {
    "Torréfaction":    [("Thermocouple type K", "TC-K-250"), ("Tambour inox 90kg", "TBR-90-SS"), ("Brûleur gaz + injecteur", "BRN-GAZ-01"), ("Moteur tambour 15kW", "MTR-15KW-B3"), ("Courroie SPC 3000", "CTR-SPC3000"), ("Joint HT silicone", "JNT-HT-SI"), ("Filtre air afterburner", "FLT-AFB-200"), ("Capteur pression gaz", "CPT-GAZ-PRG"), ("Variateur 15kW", "VFD-15KW-ABB")],
    "Mouture":         [("Meule plate inox Ø250", "MEU-250-SS"), ("Roulement 6205-2RS", "RLT-6205"), ("Moteur moulin 7.5kW", "MTR-75KW-IE3"), ("Grille calibrage 500µm", "GRL-500UM"), ("Joint torique NBR Ø80", "JOR-80-NBR"), ("Courroie poly-V 8PK1200", "CPV-8PK1200")],
    "Conditionnement": [("Mâchoire soudure téflon 200mm", "MCH-SLD-200"), ("Film kraft PE 280mm", "FLM-KPE280"), ("Pompe à vide membranaire", "PMP-VAC-01"), ("Capteur inductif NPN", "CPT-IND-NPN"), ("Électrovanne 24VDC 1/4\"", "EVL-24V-14"), ("Rouleau étiquettes thermiques", "ETQ-THERM"), ("Ressort compression doseur", "RST-DOS-A")],
    "Prétraitement":   [("Tamis vibrant maille 6mm", "TMS-6MM"), ("Moteur vibreur 0.75kW", "MTV-075KW"), ("Lentille SORTEX", "LNT-OPT-SX"), ("Ventilateur centrifuge 2.2kW", "VNT-CF-22KW")],
    "Stockage":        [("Palier UCF205", "PLR-UCF205"), ("Chaîne 16B-1", "CHN-16B1"), ("Motoréducteur 1.5kW i=30", "MRD-15KW-30"), ("Capteur niveau ultrason", "CPT-NVL-US")],
    "Utilités":        [("Filtre huile GA15", "FLH-GA15"), ("Séparateur eau/huile 40m³/h", "SEP-EAU-40"), ("Résistance chaudière 6kW", "RST-CHD-6KW"), ("Joint bride DN50", "JNT-BRD-DN50"), ("Soupape sécurité 10bar", "SVP-10BAR"), ("Courroie compresseur SPC1400", "CTR-SPC1400"), ("Batterie 12V 100Ah", "BTR-12V-100")],
    "Réception":       [("Cellule pesage 2T", "CPT-PES-2T"), ("Grille protection trémie", "GRL-TRM-A")],
}

PANNES_TEMPLATES = [
    ("Surchauffe tambour torréfacteur",    "Le tambour atteint {temp}°C (max {temp_max}°C). Alarme haute température. Arrêt automatique.", "Torréfaction"),
    ("Thermocouple défaillant",            "Lecture erratique thermocouple type K: valeurs entre -50°C et +300°C. Capteur à remplacer.", "Torréfaction"),
    ("Fuite gaz brûleur",                  "Odeur gaz détectée. Pression chute de 4 à 2.1 bars en 10 min. Arrêt d'urgence effectué.", "Torréfaction"),
    ("Défaut variateur fréquence",         "VFD affiche erreur F001 (surintensité). Arrêt torréfacteur.", "Torréfaction"),
    ("Panne refroidisseur",                "Ventilateur refroidisseur en défaut: roulement bloqué, bruit métallique.", "Torréfaction"),
    ("Vibrations anormales moulin",        "Vibrations excessives, bruit inhabituel. Suspicion meule usée ou roulement défaillant.", "Mouture"),
    ("Granulométrie hors tolérance",       "Contrôle qualité: D90=800µm au lieu de 500µm requis. Meule à régler.", "Mouture"),
    ("Défaut soudure sachet",              "Taux mauvaises soudures: 12% (tolérance 0.5%). Mâchoires à vérifier.", "Conditionnement"),
    ("Poids dosage incorrect",             "Déviation poids: 495g±8g au lieu de 500g±2g. Recalibrage doseur nécessaire.", "Conditionnement"),
    ("Panne pompe à vide",                 "Pompe ne maintient pas dépression (-0.4 bar mesuré, objectif <-0.85 bar). Sacs non étanches.", "Conditionnement"),
    ("Bourrage étiqueteuse",               "Film déchiré. Capteur présence sachet non déclenché. Arrêt ligne.", "Conditionnement"),
    ("Capteur optique encrassé",           "Trieur génère 40% faux rejets. Lentilles souillées par poussière café.", "Prétraitement"),
    ("Blocage convoyeur à vis",            "Convoyeur bloqué, moteur en défaut thermique. Corps étranger probable.", "Stockage"),
    ("Fuite d'huile compresseur",          "Flaque huile sous compresseur #1. Niveau bas. Risque panne moteur.", "Utilités"),
    ("Pression air comprimé insuffisante", "Pression réseau: 5.5 bars (minimum requis: 7 bars). Productivité réduite.", "Utilités"),
]

OT_PREVENTIF_TEMPLATES = [
    ("Révision mensuelle torréfacteur",    "Vérification brûleur, nettoyage, calibration capteurs, contrôle courroies.", "Torréfaction"),
    ("Remplacement meules moulin (200h)",  "Remplacement meules plates après 200h selon préconisation fabricant.", "Mouture"),
    ("Nettoyage trieur optique",           "Nettoyage lentilles, calibration couleurs, vérification buses air.", "Prétraitement"),
    ("Vidange et filtre compresseur",      "Vidange huile, remplacement filtres, contrôle séparateur eau/huile.", "Utilités"),
    ("Contrôle système dosage",            "Pesées contrôle 10 sachets, recalibrage si dérive > 1g.", "Conditionnement"),
    ("Graissage général convoyeurs",       "Lubrification paliers, tension chaînes, vérification pignons.", "Stockage"),
    ("Test mensuel groupe électrogène",    "Démarrage test 30 min en charge, vérification gasoil, test basculement.", "Utilités"),
    ("Entretien chaudière trimestriel",    "Détartrage, vérification soupapes, contrôle brûleur, analyse eau.", "Utilités"),
]

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def parse_pb_date(date_str: str) -> datetime:
    """Parse PocketBase date strings (handles both YYYY-MM-DD and ISO with time)."""
    if not date_str:
        return datetime.now()
    # Strip time part if present
    date_part = date_str.split(" ")[0].split("T")[0]
    return datetime.strptime(date_part, "%Y-%m-%d")

def random_date_str(days_ago_max: int, days_ago_min: int = 0) -> str:
    delta = random.randint(days_ago_min, days_ago_max)
    return (datetime.now() - timedelta(days=delta)).strftime("%Y-%m-%d")


class PocketBaseClient:
    def __init__(self, url: str):
        self.url = url.rstrip("/")
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        # Valeurs des selects récupérées dynamiquement
        self.select_values: dict[str, dict[str, list]] = {}

    def login(self, email: str, password: str):
        endpoints = [
            f"{self.url}/api/collections/_superusers/auth-with-password",
            f"{self.url}/api/admins/auth-with-password",
        ]
        for url in endpoints:
            try:
                r = requests.post(url, json={"identity": email, "password": password}, timeout=10)
                if r.ok:
                    self.token = r.json().get("token", "")
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    print(f"✅ Connecté ({url.split('/api/')[1]})")
                    return
            except requests.exceptions.ConnectionError:
                print(f"❌ Impossible de joindre {self.url}")
                exit(1)
        print("❌ Échec auth. Vérifie ADMIN_EMAIL et ADMIN_PASSWORD.")
        exit(1)

    def fetch_select_values(self):
        """Récupère les vraies valeurs des champs select depuis l'API PocketBase."""
        print("\n🔍 Récupération des valeurs des champs select...")
        r = requests.get(f"{self.url}/api/collections?perPage=100", headers=self.headers)
        if not r.ok:
            print(f"  ⚠️  Impossible de lire les collections: {r.status_code}")
            return
        collections = r.json().get("items", [])
        for col in collections:
            name = col["name"]
            self.select_values[name] = {}
            for field in col.get("schema", col.get("fields", [])):
                if field.get("type") == "select":
                    field_name = field.get("name")
                    options = field.get("options", {}) or {}
                    vals = options.get("values", [])
                    if vals:
                        self.select_values[name][field_name] = vals
                        print(f"  ✔ {name}.{field_name}: {vals}")
        print()

    def pick(self, collection: str, field: str, fallback: list) -> str:
        """Choisit une valeur valide pour un champ select."""
        vals = self.select_values.get(collection, {}).get(field, fallback)
        return random.choice(vals) if vals else random.choice(fallback)

    def pick_weighted(self, collection: str, field: str, weights: dict, fallback: list) -> str:
        """Choisit une valeur avec pondération. weights = {valeur: poids}"""
        vals = self.select_values.get(collection, {}).get(field, fallback)
        if not vals:
            return random.choice(fallback)
        # Construire la liste pondérée
        weighted = []
        for v in vals:
            w = weights.get(v, 1)
            weighted.extend([v] * w)
        return random.choice(weighted) if weighted else random.choice(vals)

    def create(self, collection: str, data: dict) -> dict:
        r = requests.post(
            f"{self.url}/api/collections/{collection}/records",
            headers=self.headers,
            json=data,
        )
        if not r.ok:
            print(f"  ❌ {collection}: {r.status_code} → {r.text[:150]}")
            return {}
        return r.json()


# ─────────────────────────────────────────────
# GÉNÉRATION
# ─────────────────────────────────────────────

def generate_equipements(pb: PocketBaseClient) -> list[dict]:
    print("📦 Création des équipements...")
    created = []
    # Pondération réaliste: surtout actifs, quelques en maintenance/panne
    weights = {"actif": 5, "en_service": 5, "operationnel": 5,
               "maintenance": 2, "en_maintenance": 2,
               "en_panne": 1, "hors_service": 1, "inactif": 1}
    for eq in EQUIPEMENTS_DATA:
        statut = pb.pick_weighted("equipements", "statut", weights, ["actif"])
        record = pb.create("equipements", {
            "nom": eq["nom"],
            "zone": eq["zone"],
            "modele": eq["modele"],
            "has_children": eq["has_children"],
            "statut": statut,
        })
        if record:
            record["_zone"] = eq["zone"]
            created.append(record)
            print(f"  ✔ {eq['nom']} [{statut}]")
    print(f"  → {len(created)}/{len(EQUIPEMENTS_DATA)} équipements créés\n")
    return created


def generate_pieces(pb: PocketBaseClient, equipements: list[dict]) -> list[dict]:
    print("🔩 Création des pièces détachées...")
    created = []
    weights_statut = {"disponible": 5, "en_stock": 5, "ok": 5,
                      "faible": 2, "stock_faible": 2,
                      "rupture": 1, "en_rupture": 1,
                      "commande": 1, "commandee": 1, "commandée": 1}
    for eq in equipements:
        zone = eq.get("_zone", "Utilités")
        pieces_zone = PIECES_PAR_ZONE.get(zone, PIECES_PAR_ZONE["Utilités"])
        nb = random.randint(2, min(5, len(pieces_zone)))
        for nom, ref in random.sample(pieces_zone, nb):
            statut = pb.pick_weighted("pieces", "statut", weights_statut, ["disponible"])
            quantite = 0 if "rupture" in statut or "rupture" == statut else random.randint(1, 20)
            record = pb.create("pieces", {
                "nom": nom,
                "reference": ref,
                "quantite": quantite,
                "statut": statut,
                "equipement": eq["id"],
            })
            if record:
                created.append(record)
    print(f"  → {len(created)} pièces créées\n")
    return created


def generate_pannes(pb: PocketBaseClient, equipements: list[dict]) -> list[dict]:
    print("⚠️  Création des pannes...")
    created = []

    eq_par_zone: dict[str, list] = {}
    for eq in equipements:
        eq_par_zone.setdefault(eq.get("_zone", ""), []).append(eq)

    # Pondérations réalistes
    statut_weights = {"resolue": 5, "resolved": 5, "fermee": 5, "cloturee": 5,
                      "en_cours": 2, "ouverte": 2, "ouvert": 2, "nouveau": 1}
    priorite_weights = {"moyenne": 4, "normal": 4, "normale": 4,
                        "haute": 3, "high": 3,
                        "critique": 1, "urgent": 1,
                        "faible": 2, "low": 2, "basse": 2}

    for _ in range(35):
        template = random.choice(PANNES_TEMPLATES)
        titre, desc_tmpl, zone_cible = template
        candidats = eq_par_zone.get(zone_cible, equipements)
        eq = random.choice(candidats)

        statut = pb.pick_weighted("pannes", "statut", statut_weights, ["ouverte"])
        priorite = pb.pick_weighted("pannes", "priorite", priorite_weights, ["moyenne"])

        # Dates cohérentes
        jours = random.randint(2, 180)
        date_panne = random_date_str(jours, jours)

        is_resolved = any(v in statut for v in ["resolu", "ferme", "clotur", "closed", "resolved"])
        date_resolution = ""
        if is_resolved:
            res_dt = datetime.strptime(date_panne, "%Y-%m-%d") + timedelta(days=random.randint(1, 7))
            if res_dt < datetime.now():
                date_resolution = res_dt.strftime("%Y-%m-%d")

        desc = desc_tmpl.format(temp=random.randint(240, 280), temp_max=230)
        notes = random.choice([
            "Intervention rapide, production maintenue sur l'autre ligne.",
            "Arrêt production 4h. Perte estimée 800kg café torréfié.",
            "Pièce commandée en urgence. Délai fournisseur 48h.",
            "Réparation effectuée par équipe interne. RAS.",
            "Sous-traitant spécialisé sollicité pour diagnostic.",
        ]) if is_resolved else ""

        record = pb.create("pannes", {
            "titre": titre,
            "description": desc,
            "equipement": eq["id"],
            "statut": statut,
            "priorite": priorite,
            "date_panne": date_panne,
            "date_resolution": date_resolution,
            "technicien": random.choice(TECHNICIENS),
            "notes": notes,
        })
        if record:
            record["_equipement_id"] = eq["id"]
            record["_statut_raw"] = statut
            record["_date_panne_raw"] = date_panne
            created.append(record)

    print(f"  → {len(created)}/35 pannes créées\n")
    return created


def generate_ordres_de_travail(pb: PocketBaseClient, equipements: list[dict], pannes: list[dict]):
    print("📋 Création des ordres de travail...")
    count = 0
    eq_map = {eq["id"]: eq for eq in equipements}
    eq_par_zone: dict[str, list] = {}
    for eq in equipements:
        eq_par_zone.setdefault(eq.get("_zone", ""), []).append(eq)

    # Récupérer les vraies valeurs
    ot_statuts  = pb.select_values.get("ordresdetravail", {}).get("statut", ["nouveau", "en_cours", "cloture"])
    ot_priorites = pb.select_values.get("ordresdetravail", {}).get("priorite", ["normale", "haute", "urgente"])
    ot_types    = pb.select_values.get("ordresdetravail", {}).get("type", ["correctif", "preventif"])

    def pick_ot_statut_for(context: str) -> str:
        """Choisit un statut OT cohérent selon le contexte (resolved/open/in_progress)."""
        if context == "resolved":
            candidates = [v for v in ot_statuts if any(x in v for x in ["clotur", "ferme", "termine", "done", "closed"])]
            return random.choice(candidates) if candidates else ot_statuts[-1]
        elif context == "in_progress":
            candidates = [v for v in ot_statuts if any(x in v for x in ["cours", "progress", "encours"])]
            return random.choice(candidates) if candidates else ot_statuts[0]
        else:  # open/new
            candidates = [v for v in ot_statuts if any(x in v for x in ["nouveau", "new", "ouvert", "planifie"])]
            return random.choice(candidates) if candidates else ot_statuts[0]

    def pick_ot_type(name: str) -> str:
        if any(x in name for x in ["correctif", "corrective", "corr"]):
            candidates = [v for v in ot_types if any(x in v for x in ["correct", "corr"])]
            return random.choice(candidates) if candidates else ot_types[0]
        else:
            candidates = [v for v in ot_types if any(x in v for x in ["prev", "planned", "plan"])]
            return random.choice(candidates) if candidates else ot_types[0]

    # ── OT CORRECTIFS liés aux pannes ──
    for panne in pannes:
        eq_id = panne.get("_equipement_id") or panne.get("equipement")
        eq = eq_map.get(eq_id, {})
        statut_panne = panne.get("_statut_raw", "")
        date_panne_str = panne.get("_date_panne_raw", random_date_str(30))

        date_panne_dt = datetime.strptime(date_panne_str, "%Y-%m-%d")
        date_creation_dt = date_panne_dt + timedelta(hours=random.randint(1, 4))
        date_debut_dt = date_creation_dt + timedelta(hours=random.randint(0, 8))

        is_resolved = any(v in statut_panne for v in ["resolu", "ferme", "clotur", "closed", "resolved"])
        is_in_progress = any(v in statut_panne for v in ["cours", "progress"])

        if is_resolved:
            ctx = "resolved"
            date_fin_prevue = (date_debut_dt + timedelta(hours=random.randint(4, 24))).strftime("%Y-%m-%d")
            date_fin_reelle = (date_debut_dt + timedelta(hours=random.randint(3, 30))).strftime("%Y-%m-%d")
            notes_cloture = random.choice([
                "Pièce remplacée. Test fonctionnel OK. Remise en production.",
                "Réglage effectué. Paramètres vérifiés. OK production.",
                "Nettoyage + remplacement joint. Machine opérationnelle.",
                "Roulement changé, alignement vérifié. Vibrations normales.",
            ])
            temps_reel = f"{random.randint(1, 10)}h"
        elif is_in_progress:
            ctx = "in_progress"
            date_fin_prevue = (datetime.now() + timedelta(hours=random.randint(2, 48))).strftime("%Y-%m-%d")
            date_fin_reelle = ""
            notes_cloture = ""
            temps_reel = ""
        else:
            ctx = "open"
            date_fin_prevue = (datetime.now() + timedelta(hours=random.randint(12, 72))).strftime("%Y-%m-%d")
            date_fin_reelle = ""
            notes_cloture = ""
            temps_reel = ""

        # Priorité cohérente avec la panne
        panne_prio = panne.get("priorite", "")
        if any(x in panne_prio for x in ["critique", "urgent"]):
            priorite = random.choice([v for v in ot_priorites if any(x in v for x in ["urgent", "critique", "haute", "high"])] or ot_priorites)
        elif any(x in panne_prio for x in ["haute", "high"]):
            priorite = random.choice([v for v in ot_priorites if any(x in v for x in ["haute", "high", "normal"])] or ot_priorites)
        else:
            priorite = random.choice(ot_priorites)

        ot_type = pick_ot_type("correctif")

        record = pb.create("ordresdetravail", {
            "reference": f"OT-CORR-{random.randint(10000, 99999)}",
            "titre": f"Correctif: {panne['titre']}",
            "type": ot_type,
            "equipement": eq_id,
            "panne_liee": panne["id"],
            "statut": pick_ot_statut_for(ctx),
            "priorite": priorite,
            "date_creation": date_creation_dt.strftime("%Y-%m-%d"),
            "date_debut": date_debut_dt.strftime("%Y-%m-%d"),
            "date_fin_prevue": date_fin_prevue,
            "date_fin_reelle": date_fin_reelle,
            "technicien": panne.get("technicien", random.choice(TECHNICIENS)),
            "equipe": random.choice(EQUIPES),
            "description": f"Intervention corrective: {panne['titre']}. Équipement: {eq.get('nom', 'N/A')} ({eq.get('zone', 'N/A')}).",
            "instructions": "1. Consigner l'équipement\n2. Diagnostiquer la cause racine\n3. Remplacer/réparer\n4. Tester et valider\n5. Déconsigner\n6. Compléter le rapport",
            "temps_estime": f"{random.randint(1, 8)}h",
            "temps_reel": temps_reel,
            "notes_cloture": notes_cloture,
        })
        if record:
            count += 1

    # ── OT PRÉVENTIFS ──
    for _ in range(40):
        titre, description, zone_cible = random.choice(OT_PREVENTIF_TEMPLATES)
        candidats = eq_par_zone.get(zone_cible, equipements)
        eq = random.choice(candidats)

        jours_passés = random.randint(0, 150)
        date_creation_dt = datetime.now() - timedelta(days=jours_passés)
        date_debut_dt = date_creation_dt + timedelta(days=random.randint(0, 5))
        date_fin_prevue = (date_debut_dt + timedelta(hours=random.randint(2, 8))).strftime("%Y-%m-%d")

        ctx = "resolved" if jours_passés > 7 and random.random() > 0.3 else ("in_progress" if jours_passés > 0 else "open")

        date_fin_reelle = ""
        notes_cloture = ""
        temps_reel = ""
        if ctx == "resolved":
            date_fin_reelle = date_fin_prevue
            temps_reel = f"{random.randint(1, 7)}h"
            notes_cloture = random.choice([
                "Entretien effectué. Aucune anomalie détectée.",
                "Entretien réalisé. Remplacement pièce d'usure anticipé.",
                "Anomalie détectée: roulement à surveiller. OT surveillance créé.",
                "Nettoyage + calibration OK. Consommables remplacés.",
            ])

        ot_type = pick_ot_type("preventif")

        record = pb.create("ordresdetravail", {
            "reference": f"OT-PREV-{random.randint(10000, 99999)}",
            "titre": titre,
            "type": ot_type,
            "equipement": eq["id"],
            "statut": pick_ot_statut_for(ctx),
            "priorite": random.choice(ot_priorites),
            "date_creation": date_creation_dt.strftime("%Y-%m-%d"),
            "date_debut": date_debut_dt.strftime("%Y-%m-%d"),
            "date_fin_prevue": date_fin_prevue,
            "date_fin_reelle": date_fin_reelle,
            "technicien": random.choice(TECHNICIENS),
            "equipe": random.choice(EQUIPES),
            "description": description,
            "instructions": "1. Arrêt propre\n2. Consignation électrique\n3. Exécuter la check-list\n4. Contrôle visuel\n5. Remettre en service\n6. Mettre à jour le carnet",
            "temps_estime": f"{random.randint(1, 6)}h",
            "temps_reel": temps_reel,
            "notes_cloture": notes_cloture,
        })
        if record:
            count += 1

    print(f"  → {count} ordres de travail créés\n")


def generate_plans_preventifs(pb: PocketBaseClient, equipements: list[dict]):
    print("📅 Création des plans préventifs...")
    count = 0
    eq_par_zone: dict[str, list] = {}
    for eq in equipements:
        eq_par_zone.setdefault(eq.get("_zone", ""), []).append(eq)

    freq_vals  = pb.select_values.get("plans_preventifs", {}).get("frequence", [])
    statut_vals = pb.select_values.get("plans_preventifs", {}).get("statut", [])

    def pick_freq(hint: str) -> str:
        if not freq_vals:
            return hint
        for v in freq_vals:
            if hint in v or v in hint:
                return v
        return random.choice(freq_vals)

    def pick_pp_statut(active: bool) -> str:
        if not statut_vals:
            return "actif" if active else "suspendu"
        if active:
            candidates = [v for v in statut_vals if any(x in v for x in ["actif", "active", "en_cours", "ok"])]
            return random.choice(candidates) if candidates else statut_vals[0]
        else:
            candidates = [v for v in statut_vals if any(x in v for x in ["suspen", "inactif", "pause", "arrete"])]
            return random.choice(candidates) if candidates else statut_vals[-1]

    plans = [
        ("Inspection quotidienne torréfacteur",   "Torréfaction",    "quotidien",    0.5, "Vérification huile, brûleur, températures, bruits anormaux."),
        ("Entretien hebdomadaire torréfacteur",   "Torréfaction",    "hebdomadaire", 2,   "Nettoyage filtre air, vérification courroies, graissage paliers."),
        ("Révision mensuelle torréfacteur",       "Torréfaction",    "mensuel",      8,   "Démontage partiel, usure, calibration thermocouples, test sécurités."),
        ("Révision annuelle torréfacteur",        "Torréfaction",    "annuel",       24,  "Révision complète: pièces d'usure, peinture, mise à niveau."),
        ("Contrôle meules moulin (hebdo)",        "Mouture",         "hebdomadaire", 1,   "Granulométrie, écart meules, nettoyage chambre de mouture."),
        ("Remplacement meules moulin",            "Mouture",         "mensuel",      4,   "Remplacement meules selon compteur heures (200h maxi)."),
        ("Nettoyage trieur optique",              "Prétraitement",   "hebdomadaire", 1,   "Nettoyage lentilles et buses, recalibration couleurs."),
        ("Vidange compresseur",                   "Utilités",        "mensuel",      2,   "Vidange huile, filtres, séparateur eau/huile, test soupape."),
        ("Entretien chaudière",                   "Utilités",        "trimestriel",  6,   "Détartrage, analyse eau, soupapes, nettoyage brûleur."),
        ("Test groupe électrogène",               "Utilités",        "mensuel",      1,   "Démarrage test 30 min, carburant, test basculement auto."),
        ("Calibration doseuse conditionnement",   "Conditionnement", "hebdomadaire", 1,   "10 pesées de contrôle, ajustement si dérive > 1g."),
        ("Révision soudeuse thermique",           "Conditionnement", "mensuel",      3,   "Températures soudure, remplacement mâchoires, essais étanchéité."),
        ("Graissage convoyeurs",                  "Stockage",        "hebdomadaire", 1,   "Lubrification paliers et chaînes selon plan de graissage."),
        ("Inspection système dépoussiérage",      "Utilités",        "mensuel",      2,   "Contrôle filtres, vidange bacs poussière, étanchéité gaines."),
    ]

    for nom, zone, freq_hint, duree, desc in plans:
        candidats = eq_par_zone.get(zone, equipements)
        eq = random.choice(candidats)
        date_debut = (datetime.now() - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d")
        record = pb.create("plans_preventifs", {
            "nom": nom,
            "equipement": eq["id"],
            "frequence": pick_freq(freq_hint),
            "statut": pick_pp_statut(random.random() > 0.25),
            "date_debut": date_debut,
            "responsable": random.choice(TECHNICIENS),
            "duree_estimee": duree,
            "description": desc,
        })
        if record:
            count += 1

    print(f"  → {count} plans préventifs créés\n")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  GÉNÉRATEUR DE DONNÉES - USINE DE CAFÉ")
    print("  CMMS PocketBase")
    print("=" * 55)

    pb = PocketBaseClient(PB_URL)
    pb.login(ADMIN_EMAIL, ADMIN_PASSWORD)
    pb.fetch_select_values()  # ← lit les vraies valeurs depuis ton PB

    equipements = generate_equipements(pb)
    if not equipements:
        print("❌ Aucun équipement créé. Arrêt.")
        exit(1)

    pieces = generate_pieces(pb, equipements)
    pannes = generate_pannes(pb, equipements)
    generate_ordres_de_travail(pb, equipements, pannes)
    generate_plans_preventifs(pb, equipements)

    print("=" * 55)
    print("  ✅ GÉNÉRATION TERMINÉE")
    print(f"  • {len(equipements)} équipements")
    print(f"  • {len(pieces)} pièces détachées")
    print(f"  • {len(pannes)} pannes")
    print(f"  • ~{len(pannes) + 40} ordres de travail")
    print(f"  • 14 plans préventifs")
    print("=" * 55)

