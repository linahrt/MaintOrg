"""
GMAO AI - API d'analyse prédictive
Auteur : Système GMAO PHENIX MIZRANA
Description : API FastAPI connectée à PocketBase pour analyse des risques
              et prédiction des pannes (score heuristique + fallback LSTM)
"""

import os
import json
import math
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path

import httpx
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# ─── Configuration ─────────────────────────────────────────────────────────────
POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://127.0.0.1:8090")
PB_EMAIL = os.getenv("PB_EMAIL", "haretlina0@gmail.com")
PB_PASSWORD = os.getenv("PB_PASSWORD", "4NAJeLiL7tncviY")
REPORTS_DIR = Path("/tmp/gmao_rapports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="GMAO AI – Analyse Prédictive",
    description="API d'analyse des risques et de prédiction des pannes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Modèles Pydantic ───────────────────────────────────────────────────────────
class RapportRequest(BaseModel):
    equipement_id: Optional[str] = None
    output_format: str = Field(default="json", pattern="^(json|docx)$")

class AnalyseResponse(BaseModel):
    status: str
    rapport_path: Optional[str] = None
    analyse: Optional[dict] = None
    message: str = ""

# ─── Helper Functions ───────────────────────────────────────────────────────────
def parse_datetime(s: Optional[str]) -> Optional[datetime]:
    """Parse une date PocketBase en objet datetime."""
    if not s:
        return None
    formats = [
        "%Y-%m-%d %H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d %H:%M:%SZ", "%Y-%m-%d"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def safe_float(val, default=0.0) -> float:
    """Conversion sécurisée en float."""
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default

# ─── PocketBase Client ──────────────────────────────────────────────────────────
class PocketBaseClient:
    """Client simplifié pour PocketBase."""
    
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.token: Optional[str] = None
    
    async def authenticate(self) -> bool:
        """Authentification admin ou user."""
        async with httpx.AsyncClient(timeout=30) as client:
            # Essai admin
            try:
                resp = await client.post(
                    f"{self.base_url}/api/admins/auth-with-password",
                    json={"identity": self.email, "password": self.password}
                )
                if resp.status_code == 200:
                    self.token = resp.json().get("token")
                    return True
            except Exception:
                pass
            
            # Essai user collection _superusers ou users
            for collection in ["_superusers", "users"]:
                try:
                    resp = await client.post(
                        f"{self.base_url}/api/collections/{collection}/auth-with-password",
                        json={"identity": self.email, "password": self.password}
                    )
                    if resp.status_code == 200:
                        self.token = resp.json().get("token")
                        return True
                except Exception:
                    continue
        return False
    
    async def fetch_collection(self, collection: str, filter_str: str = "", 
                              expand: str = "", sort: str = "-created") -> List[dict]:
        """Récupère tous les enregistrements d'une collection avec pagination."""
        if not self.token and not await self.authenticate():
            raise HTTPException(401, "Échec d'authentification PocketBase")
        
        records = []
        page = 1
        per_page = 200
        headers = {"Authorization": self.token} if self.token else {}
        
        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                params = {"page": page, "perPage": per_page, "sort": sort}
                if filter_str:
                    params["filter"] = filter_str
                if expand:
                    params["expand"] = expand
                    
                try:
                    resp = await client.get(
                        f"{self.base_url}/api/collections/{collection}/records",
                        params=params,
                        headers=headers
                    )
                    if resp.status_code != 200:
                        break
                    data = resp.json()
                    records.extend(data.get("items", []))
                    if page >= data.get("totalPages", 1):
                        break
                    page += 1
                except Exception as e:
                    print(f"Erreur fetch {collection}: {e}")
                    break
        return records

# ─── Feature Engineering ────────────────────────────────────────────────────────
def compute_equipment_features(eq: dict, pannes: list, ordres: list, 
                                pieces: list, plans: list) -> dict:
    """Calcule les KPIs et indicateurs de risque pour un équipement."""
    eq_id = eq.get("id", "")
    now = datetime.utcnow()
    
    # Filtrer les données liées à cet équipement
    eq_pannes = [p for p in pannes if p.get("equipement") == eq_id]
    eq_ordres = [o for o in ordres if o.get("equipement") == eq_id]
    eq_pieces = [p for p in pieces if p.get("equipement") == eq_id]
    eq_plans = [p for p in plans if p.get("equipement") == eq_id]
    
    # ── Métriques Pannes ─────────────────────────────────────────────────────
    nb_pannes = len(eq_pannes)
    pannes_resolues = [p for p in eq_pannes if p.get("statut") == "resolue"]
    pannes_ouvertes = [p for p in eq_pannes if p.get("statut") in ("nouvelle", "en_cours", "en_attente")]
    
    # MTTR (Mean Time To Repair)
    repair_times = []
    for p in pannes_resolues:
        d_panne = parse_datetime(p.get("date_panne"))
        d_res = parse_datetime(p.get("date_resolution"))
        if d_panne and d_res and d_res > d_panne:
            hours = (d_res - d_panne).total_seconds() / 3600
            repair_times.append(hours)
    mttr = round(np.mean(repair_times), 2) if repair_times else 0.0
    
    # MTBF (Mean Time Between Failures)
    panne_dates = sorted([
        parse_datetime(p.get("date_panne")) 
        for p in eq_pannes if p.get("date_panne")
    ], key=lambda x: x or datetime.min)
    
    intervals = []
    for i in range(1, len(panne_dates)):
        if panne_dates[i] and panne_dates[i-1]:
            hours = (panne_dates[i] - panne_dates[i-1]).total_seconds() / 3600
            intervals.append(hours)
    mtbf = round(np.mean(intervals), 2) if intervals else 9999.0
    
    # Dernière panne
    days_since_last = None
    if panne_dates and panne_dates[-1]:
        days_since_last = (now - panne_dates[-1]).days
    
    # Priorité max
    prio_weights = {"critique": 4, "haute": 3, "moyenne": 2, "basse": 1}
    max_prio = max(
        (prio_weights.get(p.get("priorite", "basse"), 1) for p in eq_pannes),
        default=1
    )
    
    # ── Métriques Ordres de Travail ──────────────────────────────────────────
    nb_ot_correctif = sum(1 for o in eq_ordres if o.get("type") == "correctif")
    nb_ot_preventif = sum(1 for o in eq_ordres if o.get("type") == "preventif")
    
    nb_ot_retard = 0
    for o in eq_ordres:
        if o.get("statut") not in ("termine", "cloture", "annule"):
            d_fin = parse_datetime(o.get("date_fin_prevue"))
            if d_fin and d_fin < now:
                nb_ot_retard += 1
    
    # ── Métriques Pièces ─────────────────────────────────────────────────────
    pieces_hs = sum(1 for p in eq_pieces if p.get("statut") == "hors_service")
    stock_faible = sum(
        1 for p in eq_pieces 
        if safe_float(p.get("quantite")) < 2 and p.get("statut") != "hors_service"
    )
    
    # ── Métriques Plans Préventifs ───────────────────────────────────────────
    plans_actifs = sum(1 for p in eq_plans if p.get("statut") == "actif")
    
    # ── Score de Risque Composite (0-1) ──────────────────────────────────────
    f_freq = min(nb_pannes / 20, 1.0)  # Fréquence pannes
    f_mttr = min(mttr / 100, 1.0) if mttr > 0 else 0  # Temps de réparation
    f_mtbf = 1.0 - min(mtbf / 500, 1.0) if mtbf < 9999 else 0  # Fiabilité
    f_prio = (max_prio - 1) / 3  # Priorité
    f_retard = min(nb_ot_retard / 5, 1.0)  # Retards OT
    f_stock = min(stock_faible / 5, 1.0)  # Stock faible
    f_stat = 1.0 if eq.get("statut") == "hors_service" else 0  # Statut équipement
    f_prev = 0.0 if plans_actifs > 0 else 0.3  # Absence préventif
    
    score = round(
        0.25*f_freq + 0.15*f_mttr + 0.15*f_mtbf + 0.15*f_prio +
        0.10*f_retard + 0.08*f_stock + 0.07*f_stat + 0.05*f_prev,
        3
    )
    
    # Niveau de risque
    if score >= 0.7:
        niveau = "CRITIQUE"
    elif score >= 0.45:
        niveau = "ÉLEVÉ"
    elif score >= 0.25:
        niveau = "MODÉRÉ"
    else:
        niveau = "FAIBLE"
    
    # Pannes récentes (30 jours)
    pannes_30j = sum(
        1 for p in eq_pannes
        if parse_datetime(p.get("date_panne")) 
        and (now - parse_datetime(p.get("date_panne"))).days <= 30
    )
    
    return {
        "id": eq_id,
        "nom": eq.get("nom", ""),
        "zone": eq.get("zone", ""),
        "statut": eq.get("statut", ""),
        "nb_pannes": nb_pannes,
        "pannes_ouvertes": len(pannes_ouvertes),
        "mttr_h": mttr,
        "mtbf_h": mtbf,
        "days_since_last_failure": days_since_last,
        "max_priorite": max_prio,
        "nb_ot_correctifs": nb_ot_correctif,
        "nb_ot_preventifs": nb_ot_preventif,
        "nb_ot_en_retard": nb_ot_retard,
        "pieces_hs": pieces_hs,
        "stock_faible": stock_faible,
        "nb_plans_actifs": plans_actifs,
        "score_risque": score,
        "niveau_risque": niveau,
        "pannes_30j": pannes_30j,
    }

# ─── Recommandations IA ───────────────────────────────────────────────────────
def generate_recommendations(feat: dict, proba: float) -> List[str]:
    """Génère des recommandations personnalisées."""
    recs = []
    
    if feat["statut"] == "hors_service":
        recs.append("⚠️ URGENT – Planifier une remise en service immédiate.")
    
    if proba >= 0.70:
        recs.append("🔴 Probabilité de panne très élevée : intervention sous 48h.")
    elif proba >= 0.45:
        recs.append("🟠 Risque élevé : inspection approfondie dans les 7 jours.")
    
    if feat["pannes_ouvertes"] > 0:
        recs.append(f"📋 {feat['pannes_ouvertes']} panne(s) non résolue(s) à traiter.")
    
    if feat["nb_ot_en_retard"] > 0:
        recs.append(f"⏰ {feat['nb_ot_en_retard']} OT en retard – replanifier.")
    
    if feat["mttr_h"] > 24:
        recs.append(f"🔧 MTTR élevé ({feat['mttr_h']}h) : optimiser les processus de réparation.")
    
    if 0 < feat["mtbf_h"] < 200:
        recs.append(f"📉 MTBF faible ({feat['mtbf_h']}h) : renforcer la maintenance préventive.")
    
    if feat["stock_faible"] > 0:
        recs.append(f"📦 {feat['stock_faible']} pièce(s) en stock faible – commander.")
    
    if feat["pieces_hs"] > 0:
        recs.append(f"🛠️ {feat['pieces_hs']} pièce(s) HS – évaluer l'impact.")
    
    if feat["nb_plans_actifs"] == 0:
        recs.append("📅 Aucun plan préventif actif – en créer un.")
    
    if feat["pannes_30j"] >= 3:
        recs.append(f"📊 {feat['pannes_30j']} pannes/30j : réaliser une analyse AMDEC.")
    
    if feat["days_since_last_failure"] is not None and feat["days_since_last_failure"] < 7:
        recs.append(f"⚡ Panne il y a {feat['days_since_last_failure']}j : contrôle post-réparation.")
    
    if not recs:
        recs.append("✅ Équipement en bon état – maintenir la surveillance.")
    
    return recs

# ─── Prédiction (Fallback heuristique + LSTM optionnel) ───────────────────────
def predict_failure_probability(features_list: List[dict]) -> dict:
    """
    Prédit la probabilité de panne.
    Utilise un score heuristique par défaut.
    LSTM activable si tensorflow est disponible.
    """
    results = {}
    
    # Tentative d'import LSTM (optionnel)
    try:
        from tensorflow import keras
        import tensorflow as tf
        from sklearn.preprocessing import MinMaxScaler
        LSTM_AVAILABLE = True
    except ImportError:
        LSTM_AVAILABLE = False
        print("⚠️ TensorFlow non disponible – utilisation du score heuristique")
    
    if not LSTM_AVAILABLE or len(features_list) < 5:
        # Fallback heuristique
        for feat in features_list:
            proba = round(feat["score_risque"] * 0.9 + 0.05, 3)
            results[feat["id"]] = {
                "proba_panne": min(proba, 0.99),
                "methode": "score_heuristique",
                "horizon_jours": 30,
            }
        return results
    
    # ── LSTM (si disponible) ─────────────────────────────────────────────────
    try:
        feature_cols = ["score_risque", "nb_pannes", "mttr_h", "pannes_30j", "nb_ot_en_retard"]
        
        # Préparation des données
        raw = np.array([[f.get(c, 0) for c in feature_cols] for f in features_list], dtype=np.float32)
        scaler = MinMaxScaler()
        raw_scaled = scaler.fit_transform(raw)
        
        # Séquences pour LSTM
        SEQ_LEN = min(5, len(raw_scaled) - 1)
        X, y = [], []
        for i in range(len(raw_scaled) - SEQ_LEN):
            X.append(raw_scaled[i:i+SEQ_LEN])
            y.append(1.0 if raw[i+SEQ_LEN][0] > 0.45 else 0.0)
        
        if len(X) < 4:
            raise ValueError("Données insuffisantes pour LSTM")
        
        # Modèle simple
        model = keras.Sequential([
            keras.layers.Input(shape=(SEQ_LEN, len(feature_cols))),
            keras.layers.LSTM(32, activation="relu"),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(16, activation="relu"),
            keras.layers.Dense(1, activation="sigmoid"),
        ])
        model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
        model.fit(np.array(X), np.array(y), epochs=20, batch_size=4, verbose=0, validation_split=0.1)
        
        # Prédictions
        for i, feat in enumerate(features_list):
            if i < SEQ_LEN:
                proba = feat["score_risque"] * 0.9
                methode = "score_heuristique"
            else:
                seq = raw_scaled[i-SEQ_LEN:i][np.newaxis, ...]
                proba = float(model.predict(seq, verbose=0)[0][0])
                methode = "lstm"
            
            results[feat["id"]] = {
                "proba_panne": round(min(proba, 0.99), 3),
                "methode": methode,
                "horizon_jours": 30,
            }
        
        return results
        
    except Exception as e:
        print(f"⚠️ Erreur LSTM : {e} – fallback heuristique")
        # Fallback en cas d'erreur
        for feat in features_list:
            results[feat["id"]] = {
                "proba_panne": round(feat["score_risque"] * 0.9 + 0.05, 3),
                "methode": "score_heuristique_fallback",
                "horizon_jours": 30,
            }
        return results

# ─── Génération Rapport DOCX (via python-docx) ─────────────────────────────────
def generate_docx_report(analyse: dict, output_path: str) -> str:
    """Génère un rapport Word avec python-docx."""
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        raise ImportError("Installez python-docx : pip install python-docx")
    
    doc = Document()
    
    # Titre
    title = doc.add_heading("Rapport d'Analyse Prédictive GMAO", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Meta
    stats = analyse.get("stats_globales", {})
    doc.add_paragraph(f"Date : {stats.get('date_rapport', 'N/A')}")
    doc.add_paragraph(f"Équipements analysés : {stats.get('nb_equipements', 0)}")
    doc.add_paragraph("")
    
    # Tableau résumé
    table = doc.add_table(rows=1, cols=4)
    table.style = "Light Grid Accent 1"
    hdr = table.rows[0].cells
    hdr[0].text = "Niveau"
    hdr[1].text = "CRITIQUE"
    hdr[2].text = "ÉLEVÉ"
    hdr[3].text = "MODÉRÉ/FAIBLE"
    
    row = table.add_row().cells
    row[0].text = "Count"
    row[1].text = str(stats.get("nb_critiques", 0))
    row[2].text = str(stats.get("nb_eleves", 0))
    row[3].text = str(stats.get("nb_moderes", 0) + stats.get("nb_faibles", 0))
    
    doc.add_paragraph("")
    
    # Détails par équipement
    doc.add_heading("Détails par Équipement", level=1)
    
    for eq in analyse.get("equipements", [])[:10]:  # Top 10
        p = doc.add_paragraph()
        p.add_run(f"🔹 {eq.get('nom')} ({eq.get('zone', 'N/A')})").bold = True
        p.add_run(f"\n   Risque : {eq.get('niveau_risque')} | Probabilité : {eq.get('proba_panne_lstm', 0)*100:.1f}%")
        
        if eq.get("recommandations"):
            p.add_run("\n   Recommandations :")
            for rec in eq["recommandations"][:3]:
                p.add_run(f"\n   • {rec}")
        doc.add_paragraph("")
    
    doc.save(output_path)
    return output_path

# ─── Pipeline Principal ───────────────────────────────────────────────────────
async def run_analysis_pipeline(equipement_id: Optional[str] = None) -> dict:
    """Pipeline complet : fetch → features → prediction → recommendations."""
    pb = PocketBaseClient(POCKETBASE_URL, PB_EMAIL, PB_PASSWORD)
    
    # Fetch données
    eq_filter = f'id="{equipement_id}"' if equipement_id else ""
    
    try:
        equipements, pannes, ordres, pieces, plans = await asyncio.gather(
            pb.fetch_collection("equipements", eq_filter),
            pb.fetch_collection("pannes", f'equipement="{equipement_id}"' if equipement_id else ""),
            pb.fetch_collection("ordresdetravail", f'equipement="{equipement_id}"' if equipement_id else ""),
            pb.fetch_collection("pieces", f'equipement="{equipement_id}"' if equipement_id else ""),
            pb.fetch_collection("plans_preventifs", f'equipement="{equipement_id}"' if equipement_id else ""),
        )
    except Exception as e:
        raise HTTPException(500, f"Erreur fetch PocketBase : {str(e)}")
    
    if not equipements:
        raise HTTPException(404, "Aucun équipement trouvé.")
    
    # Calcul features
    features_list = [
        compute_equipment_features(eq, pannes, ordres, pieces, plans)
        for eq in equipements
    ]
    
    # Prédictions
    predictions = predict_failure_probability(features_list)
    
    # Assemblage rapport
    rapport = []
    for feat in features_list:
        pred = predictions.get(feat["id"], {"proba_panne": feat["score_risque"], "methode": "fallback"})
        proba = pred["proba_panne"]
        recs = generate_recommendations(feat, proba)
        
        rapport.append({
            **feat,
            "proba_panne_lstm": proba,
            "methode_prediction": pred.get("methode", "heuristique"),
            "recommandations": recs,
        })
    
    # Tri par risque décroissant
    rapport.sort(key=lambda x: x["proba_panne_lstm"], reverse=True)
    
    # Stats globales
    now = datetime.utcnow()
    stats = {
        "date_rapport": now.strftime("%d/%m/%Y %H:%M"),
        "nb_equipements": len(rapport),
        "nb_critiques": sum(1 for e in rapport if e["niveau_risque"] == "CRITIQUE"),
        "nb_eleves": sum(1 for e in rapport if e["niveau_risque"] == "ÉLEVÉ"),
        "nb_moderes": sum(1 for e in rapport if e["niveau_risque"] == "MODÉRÉ"),
        "nb_faibles": sum(1 for e in rapport if e["niveau_risque"] == "FAIBLE"),
        "nb_pannes_total": len(pannes),
        "nb_ot_total": len(ordres),
        "nb_plans_preventifs": len(plans),
        "equipements_hors_service": sum(1 for e in equipements if e.get("statut") == "hors_service"),
        "taux_maintenance_preventive": round(
            sum(e["nb_ot_preventifs"] for e in rapport) / 
            max(sum(e["nb_ot_correctifs"] + e["nb_ot_preventifs"] for e in rapport), 1) * 100,
            1
        ),
    }
    
    return {
        "stats_globales": stats,
        "equipements": rapport,
    }

# ─── Routes API ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Santé"])
async def health():
    return {"status": "ok", "service": "GMAO AI API", "version": "1.0.0"}

@app.post("/api/analyse", response_model=AnalyseResponse, tags=["Analyse"])
async def analyse_endpoint(req: RapportRequest):
    """Lance l'analyse et retourne JSON ou génère DOCX."""
    try:
        analyse = await run_analysis_pipeline(req.equipement_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erreur analyse : {str(e)}")
    
    if req.output_format == "json":
        return AnalyseResponse(
            status="success",
            analyse=analyse,
            message="Analyse terminée."
        )
    
    # Génération DOCX
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"rapport_gmao_{ts}.docx"
    output_path = REPORTS_DIR / filename
    
    try:
        generate_docx_report(analyse, str(output_path))
    except ImportError as e:
        raise HTTPException(500, f"Erreur docx : {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Erreur génération : {str(e)}")
    
    return AnalyseResponse(
        status="success",
        rapport_path=f"/api/rapport/{filename}",
        message="Rapport DOCX généré."
    )

@app.get("/api/rapport/{filename}", tags=["Rapport"])
async def download_rapport(filename: str):
    """Télécharge un rapport généré."""
    filepath = REPORTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "Rapport introuvable.")
    
    return FileResponse(
        str(filepath),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )

@app.get("/api/equipements/{eq_id}/risque", tags=["Analyse"])
async def risque_equipement(eq_id: str):
    """Analyse de risque pour un équipement spécifique."""
    try:
        analyse = await run_analysis_pipeline(eq_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
    
    if not analyse["equipements"]:
        raise HTTPException(404, "Équipement non trouvé.")
    
    return {
        "status": "success",
        "equipement": analyse["equipements"][0],
        "stats": analyse["stats_globales"],
    }

@app.get("/api/dashboard", tags=["Dashboard"])
async def dashboard_summary():
    """Résumé pour le dashboard frontend."""
    try:
        analyse = await run_analysis_pipeline(None)
    except Exception as e:
        raise HTTPException(500, str(e))
    
    critiques = [e for e in analyse["equipements"] if e["niveau_risque"] == "CRITIQUE"]
    
    return {
        "stats": analyse["stats_globales"],
        "equipements_critiques": critiques,
        "top5_risque": analyse["equipements"][:5],
    }

# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)