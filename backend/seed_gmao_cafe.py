"""
Générateur de données réalistes — GMAO Usine de Café
Remplit : pannes, ordresdetravail, pieces, plans_preventifs
Ne touche PAS aux équipements existants.

Usage:
    pip install requests python-dateutil
    python seed_gmao_cafe.py --url http://127.0.0.1:8090/ --email haretlina0@gmail.com --password 4NAJeLiL7tncviY
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, date

import requests

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
random.seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# DONNÉES MÉTIER — Usine de café
# ---------------------------------------------------------------------------

PANNES_TEMPLATES = [
    # (titre, description, priorité)
    ("Brûleur torréfacteur HS", "Le brûleur principal ne s'allume plus, perte de chaleur totale en chambre de torréfaction.", "critique"),
    ("Capteur température défaillant", "Le capteur PT100 renvoie des valeurs aberrantes (>300°C à froid), impossible de valider le profil de torréfaction.", "haute"),
    ("Fuite huile pompe hydraulique", "Flaque d'huile constatée sous la pompe hydraulique de la presse à pellets, risque de glissade.", "haute"),
    ("Convoyeur grains bloqué", "Le tapis convoyeur s'arrête toutes les 5 minutes sur défaut de surcharge, probable bourrage interne.", "moyenne"),
    ("Vibrations anormales broyeur", "Vibrations excessives détectées sur le broyeur à disques, probable balourd ou roulement usé.", "haute"),
    ("Vanne dosage café bloquée", "La vanne pneumatique de dosage reste en position ouverte, surdosage continu.", "critique"),
    ("Fuite vapeur échangeur", "Fuite de vapeur détectée au niveau des joints de l'échangeur thermique du décaféineur.", "haute"),
    ("Moteur tapis de refroidissement chauffe", "Le moteur du tapis de refroidissement monte à 85°C après 20 min de fonctionnement (seuil 70°C).", "moyenne"),
    ("Capteur niveau trémie HS", "Le capteur ultrasonique de niveau de la trémie d'alimentation ne répond plus.", "basse"),
    ("Courroie ensacheuse cassée", "La courroie de transmission de l'ensacheuse a lâché en pleine production, arrêt ligne.", "critique"),
    ("Compresseur air bruit anormal", "Claquement métallique rythmique sur le compresseur d'air, probable bielle ou soupape.", "haute"),
    ("Vanne retour eau décaféination", "La vanne de retour eau du circuit de décaféination ne se ferme pas complètement, perte de process.", "moyenne"),
    ("Écran IHM torréfacteur illisible", "L'écran tactile de l'IHM du torréfacteur 2 est mort, impossible de lancer les recettes.", "haute"),
    ("Fuites joints silo stockage", "Joints d'étanchéité du silo n°3 dégradés, risque d'humidité sur les grains verts.", "basse"),
    ("Surchauffe variateur broyeur", "Le variateur de fréquence du broyeur déclenche en thermique après 30 min, manque de ventilation.", "moyenne"),
    ("Problème ensachage poids incorrect", "L'ensacheuse débite 250g au lieu de 500g, dérive du système de pesage.", "haute"),
    ("Détecteur métaux hors service", "Le détecteur de métaux en ligne ne valide plus les lots, ligne arrêtée par procédure qualité.", "critique"),
    ("Fuite gaz inertage silo", "Fuite d'azote sur le circuit d'inertage du silo café torréfié, consommation anormale.", "moyenne"),
    ("Rouleaux broyeur usés", "Qualité de mouture dégradée, particules trop grossières, rouleaux en fin de vie.", "basse"),
    ("Défaut photocellule ensacheuse", "La photocellule de détection sachet déclenche des faux positifs, rejets anormaux.", "moyenne"),
]

# Pièces par famille de machine — (nom, référence, qté_min, qté_max)
# La famille est détectée sur le nom de l'équipement (mots-clés, insensible à la casse)
PIECES_PAR_FAMILLE = {
    "torrefacteur": [
        ("Brûleur gaz inox Ø50 GOGLIO", "TOR-BRL-050", 1, 4),
        ("Joint porte chambre torréfaction", "TOR-JPT-CHB", 2, 8),
        ("Sonde thermocouple type K Ø6mm", "TOR-SND-TCK", 3, 12),
        ("Capteur PT100 classe B 1/3 DIN", "TOR-CPT-PT100", 2, 8),
        ("Câble blindé PT100 5m", "TOR-CBL-PT100", 4, 20),
        ("Vanne gaz DN25 inox haute temp.", "TOR-VGZ-DN25", 1, 4),
        ("Réfractaire chambre 230x114x65mm", "TOR-RFR-230", 5, 30),
        ("Filtre à manches polyester Ø150", "TOR-FLT-MNC", 2, 10),
        ("Moteur tambour 3kW 400V", "TOR-MOT-3KW", 1, 3),
        ("Roulement à rouleaux 22210", "TOR-RLT-22210", 2, 8),
        ("Grille inox tamisage maille 2mm", "TOR-GRL-2MM", 2, 6),
        ("Accouplement élastique Ø65", "TOR-ACP-065", 1, 4),
        ("Variateur fréquence 5.5kW GOGLIO", "TOR-VFQ-55", 1, 2),
        ("Électrovanne gaz 24VDC NC", "TOR-ELV-GAZ", 2, 8),
        ("Relais thermique 4-6A", "TOR-RLT-TH46", 3, 10),
        ("Tapis refroidissement L=3m", "TOR-TPS-REF", 1, 2),
        ("Joint spiral inox+graphite DN65", "TOR-JSP-DN65", 4, 16),
        ("Huile réducteur ISO VG 220 5L", "TOR-HLB-220", 2, 10),
    ],
    "moulin": [
        ("Meule plate carbure Ø300mm EUROPEMILL", "MOU-MEU-300", 1, 6),
        ("Meule conique carbure Ø120mm", "MOU-MEU-120", 2, 8),
        ("Roulement à billes 6205-2RS", "MOU-RLT-6205", 4, 20),
        ("Roulement à billes 6307-2RS", "MOU-RLT-6307", 2, 10),
        ("Joint spi Ø35x52x8 NBR", "MOU-JSP-035", 6, 30),
        ("Grille de mouture inox maille 0.5mm", "MOU-GRL-05", 2, 8),
        ("Grille de mouture inox maille 1mm", "MOU-GRL-10", 2, 8),
        ("Courroie trapézoïdale SPB-1800", "MOU-CRR-SPB1800", 2, 10),
        ("Courroie trapézoïdale SPB-2000", "MOU-CRR-SPB2000", 2, 10),
        ("Variateur fréquence 7.5kW EUROPEMILL", "MOU-VFQ-75", 1, 3),
        ("Capteur vibration piézo ICP", "MOU-CPT-VIB", 2, 6),
        ("Joint torique Ø60 EPDM alimentaire", "MOU-JTO-060", 5, 25),
        ("Vis sans fin inox 316L", "MOU-VIS-INX", 2, 6),
        ("Filtre aspiration poussière G4", "MOU-FLT-G4", 4, 20),
        ("Palier SNL 207 + roulement", "MOU-PLR-SNL207", 2, 6),
        ("Accouplement élastique Ø45", "MOU-ACP-045", 2, 6),
        ("Moteur principal 11kW 400V", "MOU-MOT-11KW", 1, 2),
        ("Électrovanne air Ø1/4 24VDC", "MOU-ELV-AIR", 3, 12),
    ],
    "conditionneuse": [
        ("Cellule de charge 500g HBM", "CON-CLC-500G", 2, 8),
        ("Cellule de charge 1kg HBM", "CON-CLC-1KG", 2, 8),
        ("Photocellule diffuse 10-30VDC", "CON-PHC-DIF", 3, 15),
        ("Courroie plate L=1800 l=50mm", "CON-CRR-PL1800", 2, 8),
        ("Mâchoire de soudure téflon 300mm", "CON-MCH-TFE", 2, 10),
        ("Résistance chauffante cartouche 500W", "CON-RST-500W", 4, 16),
        ("Thermocouple type J mâchoire", "CON-TCJ-MCH", 3, 12),
        ("Régulateur température PID", "CON-REG-PID", 1, 4),
        ("Joint vide pompe à palettes", "CON-JNT-VID", 4, 20),
        ("Filtre pompe à vide 0.3µm", "CON-FLT-VID", 3, 15),
        ("Huile pompe à vide Busch RD 100", "CON-HLB-VID", 2, 10),
        ("Électrovanne vide 24VDC 2/2", "CON-ELV-VID", 2, 8),
        ("Roulement à billes 6003-2RS", "CON-RLT-6003", 6, 25),
        ("Courroie crantée T5-800", "CON-CRR-T5800", 3, 12),
        ("Capteur proximité inductif 12mm", "CON-CPT-IND", 4, 16),
        ("Manomètre vide 0/-1 bar Ø63", "CON-MNM-VID", 2, 8),
        ("Film sous-vide PA/PE 90µm", "CON-FLM-VIDE", 10, 50),
        ("Colle hotmelt bâton Ø12mm", "CON-COL-HML", 20, 100),
    ],
    "capsuleuse": [
        ("Tête de sertissage Ø53mm inox", "CAP-TTE-053", 1, 4),
        ("Joint torique tête sertissage Ø53", "CAP-JTO-053", 4, 20),
        ("Couteau circulaire découpe capsule", "CAP-CTV-CRC", 2, 8),
        ("Roulement axial 51102", "CAP-RLT-51102", 4, 16),
        ("Roulement à billes 6001-2RS", "CAP-RLT-6001", 6, 24),
        ("Courroie crantée HTD-450", "CAP-CRR-HTD", 2, 8),
        ("Capteur inductif Ø8mm 24VDC", "CAP-CPT-IND", 3, 12),
        ("Photocellule fibre optique", "CAP-PHC-FBR", 2, 8),
        ("Électrovanne air 1/8 24VDC", "CAP-ELV-18", 3, 10),
        ("Vérin pneumatique Ø32 c=50mm", "CAP-VRN-032", 2, 6),
        ("Joint V-ring Ø40 NBR", "CAP-JVR-040", 6, 24),
        ("Moteur servo 0.75kW avec encodeur", "CAP-MOT-SRV", 1, 3),
        ("Variateur servo 0.75kW", "CAP-VFQ-SRV", 1, 2),
        ("Cellule de charge 2kg", "CAP-CLC-2KG", 2, 6),
        ("Film aluminium capsule 38µm", "CAP-FLM-ALU", 10, 50),
        ("Plaque chauffe soudure alu", "CAP-PLQ-CHF", 1, 4),
        ("Résistance cartouche 300W 230V", "CAP-RST-300W", 3, 12),
    ],
}

# Mots-clés pour détecter la famille (insensible à la casse)
FAMILLE_KEYWORDS = {
    "torrefacteur": ["torref", "torréf", "caramel"],  # TORREFACTEUR Caramel aussi
    "moulin":       ["moulin"],
    "conditionneuse": ["condition", "conditionn"],
    "capsuleuse":   ["capsul"],
}

def detect_famille(nom_equipement: str) -> str | None:
    """Retourne la famille de l'équipement à partir de son nom."""
    nom = nom_equipement.lower()
    for famille, keywords in FAMILLE_KEYWORDS.items():
        if any(kw in nom for kw in keywords):
            return famille
    return None

PLANS_PREVENTIFS_TEMPLATES = [
    ("Vérification brûleurs torréfacteurs", "quotidien", "Contrôle visuel allumage, pression gaz, couleur flamme. Nettoyage buses si encrassement."),
    ("Graissage roulements convoyeurs", "hebdomadaire", "Graissage des 8 paliers convoyeurs avec graisse alimentaire NSF H1."),
    ("Contrôle courroies et transmissions", "hebdomadaire", "Vérification tension, usure, alignement de toutes les courroies. Remplacement si > 20% d'usure."),
    ("Nettoyage filtres à air", "mensuel", "Nettoyage à air comprimé des filtres G4 de toutes les centrales. Remplacement si colmatage > 60%."),
    ("Étalonnage capteurs température", "mensuel", "Contrôle et étalonnage de tous les capteurs PT100 et thermocouples avec bain thermostaté de référence."),
    ("Vidange huile hydraulique presses", "trimestriel", "Vidange complète et remplacement filtre circuit hydraulique presses à pellets."),
    ("Inspection chambre torréfaction", "mensuel", "Contrôle réfractaires, joints porte, état brûleurs, nettoyage chambre et conduits fumées."),
    ("Vérification sécurités machines", "hebdomadaire", "Test arrêts d'urgence, barrières immatérielles, portes verrouillées. Traçabilité obligatoire."),
    ("Révision générale broyeur à disques", "semestriel", "Démontage complet, mesure usure disques, remplacement roulements, joints, réglage jeu disques."),
    ("Contrôle circuit inertage azote", "mensuel", "Vérification étanchéité circuit, pression, débit N2, enregistrement consommation par silo."),
    ("Étalonnage cellules de charge ensacheuses", "mensuel", "Étalonnage de toutes les cellules de charge avec masse étalon certifiée. Tolérance ±1g."),
    ("Vérification détecteurs métaux", "hebdomadaire", "Test avec éprouvettes certifiées Fe/non-Fe/inox. Enregistrement résultats pour traçabilité IFS."),
    ("Nettoyage décaféineur CO2", "mensuel", "Nettoyage échangeurs, vérification vannes, contrôle joints haute pression, test étanchéité."),
    ("Inspection électrique armoires", "trimestriel", "Contrôle serrage bornes, état câbles, température composants par caméra thermique, test différentiels."),
    ("Révision compresseurs air comprimé", "semestriel", "Changement filtres, huile, courroies. Vérification sécurités pression. Analyse huile résiduelle."),
]

TECHNICIENS = ["Ahmed Benali", "Karim Meziane", "Sofiane Aït", "Fatima Zerrouk", "Nabil Hamdi", "Riad Oukaci"]
EQUIPES = ["Équipe A", "Équipe B", "Équipe C"]


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def rand_date(start_days_ago: int, end_days_ago: int = 0) -> str:
    """Retourne une date ISO entre [aujourd'hui - start_days_ago] et [aujourd'hui - end_days_ago]"""
    start = date.today() - timedelta(days=start_days_ago)
    end = date.today() - timedelta(days=end_days_ago)
    delta = (end - start).days
    if delta < 0:
        delta = 0
    d = start + timedelta(days=random.randint(0, delta))
    return d.strftime("%Y-%m-%d 00:00:00.000Z")


def rand_date_after(base_date_str: str, min_days: int = 1, max_days: int = 14) -> str:
    """Retourne une date ISO après base_date_str"""
    base = datetime.strptime(base_date_str, "%Y-%m-%d 00:00:00.000Z").date()
    d = base + timedelta(days=random.randint(min_days, max_days))
    return d.strftime("%Y-%m-%d 00:00:00.000Z")


def statut_panne_poids() -> str:
    return random.choices(
        ["nouvelle", "en_cours", "en_attente", "résolue", "non_reparable"],
        weights=[10, 20, 15, 50, 5]
    )[0]


def statut_ot_poids() -> str:
    return random.choices(
        ["brouillon", "planifie", "en_cours", "en_attente", "termine", "annule"],
        weights=[5, 15, 20, 10, 45, 5]
    )[0]


def ot_reference(idx: int) -> str:
    return f"OT-{date.today().year}-{idx:04d}"


# ---------------------------------------------------------------------------
# API CLIENT
# ---------------------------------------------------------------------------

class PocketBaseClient:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.token = None
        self._login(email, password)

    def _login(self, email: str, password: str):
        r = requests.post(
            f"{self.base_url}/api/collections/users/auth-with-password",
            json={"identity": email, "password": password},
            timeout=10
        )
        if r.status_code != 200:
            print(f"❌ Authentification échouée : {r.status_code} — {r.text}")
            sys.exit(1)
        self.token = r.json()["token"]
        print("✅ Connecté à PocketBase")

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def list_all(self, collection: str) -> list:
        """Récupère tous les enregistrements (pagination auto)"""
        records = []
        page = 1
        while True:
            r = requests.get(
                f"{self.base_url}/api/collections/{collection}/records",
                params={"page": page, "perPage": 200},
                headers=self.headers,
                timeout=10
            )
            if r.status_code != 200:
                print(f"⚠️  Impossible de lire {collection} : {r.text}")
                return []
            data = r.json()
            records.extend(data["items"])
            if page >= data["totalPages"]:
                break
            page += 1
        return records

    def create(self, collection: str, payload: dict) -> dict | None:
        r = requests.post(
            f"{self.base_url}/api/collections/{collection}/records",
            json=payload,
            headers=self.headers,
            timeout=10
        )
        if r.status_code not in (200, 201):
            print(f"  ⚠️  Erreur création dans {collection} : {r.status_code} — {r.text[:200]}")
            return None
        return r.json()

    def clear_collection(self, collection: str):
        """Supprime tous les enregistrements d'une collection"""
        records = self.list_all(collection)
        for rec in records:
            r = requests.delete(
                f"{self.base_url}/api/collections/{collection}/records/{rec['id']}",
                headers=self.headers,
                timeout=10
            )
            if r.status_code not in (200, 204):
                print(f"  ⚠️  Suppression échouée pour {rec['id']} dans {collection}")
        print(f"  🗑️  {len(records)} enregistrements supprimés dans {collection}")


# ---------------------------------------------------------------------------
# GÉNÉRATEURS
# ---------------------------------------------------------------------------

def seed_pieces(pb: PocketBaseClient, equipements: list[dict]):
    """Crée des pièces cohérentes avec la famille de chaque équipement.
    Chaque machine reçoit entre 3 et 6 pièces piochées dans son catalogue."""
    print(f"\n📦 Génération des pièces de rechange (cohérentes par machine)...")
    created = 0
    piece_idx = 0

    for equip in equipements:
        nom_equip = equip.get("nom", "")
        equip_id  = equip["id"]
        famille   = detect_famille(nom_equip)

        if famille is None:
            print(f"  ⚠️  Famille inconnue pour « {nom_equip} » — ignoré")
            continue

        catalogue = PIECES_PAR_FAMILLE[famille]
        # Nombre de pièces différentes pour cette machine (3 à 6)
        nb = random.randint(3, min(6, len(catalogue)))
        selection = random.sample(catalogue, nb)

        for nom, ref, qmin, qmax in selection:
            quantite = random.randint(qmin, qmax)

            if quantite <= 1:
                statut = "rupture_de_stock"
            elif quantite <= 3:
                statut = "stock_faible"
            else:
                statut = "stock_disponible"

            payload = {
                "nom": nom,
                "reference": f"{ref}-{piece_idx:03d}",
                "statut": statut,
                "quantite": quantite,
                "equipement": equip_id,
            }
            r = pb.create("pieces", payload)
            if r:
                created += 1
            piece_idx += 1

    print(f"  ✅ {created} pièces créées")


def seed_pannes(pb: PocketBaseClient, equipement_ids: list[str], count: int = 40) -> list[str]:
    print(f"\n🔴 Génération de {count} pannes...")
    panne_ids = []
    created = 0
    for i in range(count):
        tpl = random.choice(PANNES_TEMPLATES)
        titre, description, priorite = tpl

        date_panne = rand_date(180, 1)
        statut = statut_panne_poids()

        date_resolution = None
        if statut in ("résolue", "non_reparable"):
            date_resolution = rand_date_after(date_panne, 1, 21)

        payload = {
            "titre": titre,
            "description": description,
            "equipement": random.choice(equipement_ids),
            "statut": statut,
            "date_panne": date_panne,
            "priorite": priorite,
            "technicien": random.choice(TECHNICIENS) if random.random() > 0.2 else "",
            "notes": random.choice([
                "Pièce de rechange commandée en urgence.",
                "Intervention temporaire en attente pièce.",
                "Réparation définitive effectuée, machine testée OK.",
                "En attente arrêt de production pour intervenir.",
                "Sous-traitant spécialisé contacté.",
                "",
                "",
            ]),
        }
        if date_resolution:
            payload["date_resolution"] = date_resolution

        r = pb.create("pannes", payload)
        if r:
            panne_ids.append(r["id"])
            created += 1
    print(f"  ✅ {created} pannes créées")
    return panne_ids


def seed_ordres_de_travail(
    pb: PocketBaseClient,
    equipement_ids: list[str],
    panne_ids: list[str],
    count: int = 60
):
    print(f"\n📋 Génération de {count} ordres de travail...")
    created = 0
    ot_idx = 1

    for i in range(count):
        type_ot = random.choices(
            ["correctif", "preventif", "amelioratif", "urgent"],
            weights=[35, 35, 15, 15]
        )[0]

        priorite = random.choices(
            ["basse", "moyenne", "haute", "critique"],
            weights=[20, 40, 25, 15]
        )[0]

        date_creation = rand_date(200, 2)
        statut = statut_ot_poids()

        date_debut = rand_date_after(date_creation, 0, 7) if statut != "brouillon" else None
        date_fin_prevue = rand_date_after(date_creation, 3, 21)

        date_fin_reelle = None
        if statut == "termine":
            date_fin_reelle = rand_date_after(date_fin_prevue, -5, 10) if date_debut else None

        # Lier à une panne pour les OT correctifs/urgents
        panne_liee = []
        if type_ot in ("correctif", "urgent") and panne_ids and random.random() > 0.3:
            panne_liee = [random.choice(panne_ids)]

        titres_ot = {
            "correctif": [
                "Remplacement roulement broyeur",
                "Réparation vanne pneumatique",
                "Changement courroie ensacheuse",
                "Remplacement capteur température",
                "Réparation fuite joint vapeur",
                "Changement moteur convoyeur",
            ],
            "preventif": [
                "Maintenance périodique torréfacteur",
                "Graissage et contrôle transmissions",
                "Étalonnage capteurs ligne",
                "Nettoyage filtres et tamis",
                "Inspection sécurités machines",
                "Révision compresseur air comprimé",
            ],
            "amelioratif": [
                "Installation variateur fréquence broyeur",
                "Remplacement IHM vieillissante",
                "Ajout capteur vibration préventif",
                "Amélioration circuit inertage",
                "Mise à jour logiciel supervision",
            ],
            "urgent": [
                "Intervention urgente arrêt production",
                "Réparation urgente brûleur",
                "Dépannage ensacheuse — ligne arrêtée",
                "Remplacement urgent cellule de charge",
                "Réparation urgente détecteur métaux",
            ],
        }

        titre = random.choice(titres_ot[type_ot])
        temps_estime = f"{random.choice([1, 2, 4, 8, 12, 16, 24])}h"
        temps_reel = f"{random.randint(1, 20)}h" if statut == "termine" else ""

        payload = {
            "reference": ot_reference(ot_idx),
            "titre": titre,
            "type": type_ot,
            "equipement": random.choice(equipement_ids),
            "statut": statut,
            "priorite": priorite,
            "date_creation": date_creation,
            "technicien": random.choice(TECHNICIENS) if random.random() > 0.15 else "",
            "equipe": random.choice(EQUIPES) if random.random() > 0.4 else "",
            "temps_estime": temps_estime,
            "temps_reel": temps_reel,
            "description": f"Ordre de travail {type_ot} généré suite à {random.choice(['inspection', 'signalement opérateur', 'défaut automate', 'plan préventif', 'audit qualité'])}.",
            "instructions": random.choice([
                "Consigner la machine avant intervention. Porter EPI complets. Tester après réparation.",
                "Suivre la procédure P-MAINT-042. Renseigner la GMAO en temps réel.",
                "Intervention en présence du responsable de zone. Traçabilité pièces changées obligatoire.",
                "Vérifier le stock pièces avant démarrage. Commander si manquant.",
                "",
            ]),
            "notes_cloture": random.choice([
                "Intervention réalisée conformément à la procédure. Machine testée et validée.",
                "Pièce remplacée. Test 30 min OK. Retour à la production.",
                "Anomalie résolue. Préconisation : augmenter fréquence préventif.",
                "",
                "",
                "",
            ]) if statut == "termine" else "",
        }

        if panne_liee:
            payload["panne_liee"] = panne_liee
        if date_debut:
            payload["date_debut"] = date_debut
        if date_fin_prevue:
            payload["date_fin_prevue"] = date_fin_prevue
        if date_fin_reelle:
            payload["date_fin_reelle"] = date_fin_reelle

        r = pb.create("ordresdetravail", payload)
        if r:
            created += 1
            ot_idx += 1

    print(f"  ✅ {created} ordres de travail créés")


def seed_plans_preventifs(pb: PocketBaseClient, equipement_ids: list[str]):
    print(f"\n📅 Génération de {len(PLANS_PREVENTIFS_TEMPLATES)} plans préventifs...")
    created = 0
    for nom, frequence, description in PLANS_PREVENTIFS_TEMPLATES:
        # Assigner à 1 ou plusieurs équipements (1 à 3)
        nb_equip = random.randint(1, min(3, len(equipement_ids)))
        equip_selection = random.sample(equipement_ids, nb_equip)

        for equip_id in equip_selection:
            payload = {
                "nom": nom,
                "equipement": equip_id,
                "frequence": frequence,
                "statut": random.choices(["actif", "inactif", "pause"], weights=[75, 10, 15])[0],
                "date_debut": rand_date(365, 30),
                "responsable": random.choice(TECHNICIENS),
                "duree_estimee": random.choice([0.5, 1, 2, 4, 8]),
                "description": description,
            }
            r = pb.create("plans_preventifs", payload)
            if r:
                created += 1

    print(f"  ✅ {created} plans préventifs créés")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Seed GMAO Usine de Café — PocketBase")
    parser.add_argument("--url", default="http://localhost:8090", help="URL PocketBase (ex: http://localhost:8090)")
    parser.add_argument("--email", required=True, help="Email admin PocketBase")
    parser.add_argument("--password", required=True, help="Mot de passe admin")
    parser.add_argument("--clear", action="store_true", help="Vider les collections avant de remplir")
    parser.add_argument("--pannes", type=int, default=40, help="Nombre de pannes à créer (défaut: 40)")
    parser.add_argument("--ots", type=int, default=60, help="Nombre d'OT à créer (défaut: 60)")
    args = parser.parse_args()

    print("=" * 60)
    print("  🫘  GMAO Usine de Café — Générateur de données")
    print("=" * 60)

    pb = PocketBaseClient(args.url, args.email, args.password)

    # Récupérer les équipements existants (on ne les modifie pas)
    equipements = pb.list_all("equipements")
    if not equipements:
        print("❌ Aucun équipement trouvé. Veuillez d'abord créer les équipements dans PocketBase.")
        sys.exit(1)

    equipement_ids = [e["id"] for e in equipements]
    print(f"\n🏭 {len(equipements)} équipements trouvés :")
    for e in equipements:
        print(f"   • [{e['id']}] {e.get('nom', '?')} — {e.get('zone', '?')}")

    # Optionnel : vider les collections avant
    if args.clear:
        print("\n🗑️  Nettoyage des collections...")
        for col in ["ordresdetravail", "pannes", "pieces", "plans_preventifs"]:
            pb.clear_collection(col)

    # Génération
    seed_pieces(pb, equipements)
    panne_ids = seed_pannes(pb, equipement_ids, args.pannes)
    seed_ordres_de_travail(pb, equipement_ids, panne_ids, args.ots)
    seed_plans_preventifs(pb, equipement_ids)

    print("\n" + "=" * 60)
    print("  ✅  Génération terminée !")
    print("=" * 60)


if __name__ == "__main__":
    main()