import os
import tempfile
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Any
import json

from .modele import Tache
from .import_donnees import charger_taches
from .orchestrateur import planifier

app = FastAPI(title="Organisateur d'Emploi du Temps API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/importer", response_model=List[Tache])
async def importer_fichier(file: UploadFile = File(...)):
    """
    Reçoit un fichier JSON, CSV, ou Excel et retourne la liste de tâches parsées.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni.")
    
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {".json", ".csv", ".xls", ".xlsx"}
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{ext}' non supportée. Formats acceptés : JSON, CSV, XLSX, XLS."
        )
    
    # Write upload to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        taches = charger_taches(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        os.unlink(tmp_path)
    
    return taches


class PlanningItemExistant(BaseModel):
    id: str
    date: str
    debut: str
    fin: str

class PlanifierRequest(BaseModel):
    taches: List[Tache]
    mode: Literal["csp_seul", "csp_regles"]
    date_debut: str
    date_fin: str
    planning_existant: List[PlanningItemExistant] = []


@app.post("/api/planifier")
async def planifier_endpoint(req: PlanifierRequest):
    """
    Reçoit une liste de tâches et génère le planning pour la plage de dates.
    Le planning_existant (créneaux déjà occupés) est respecté comme contrainte.
    """
    try:
        # Convert existing planning items to the format expected by orchestrateur
        planning_existant = [
            {"id": p.id, "date": p.date, "debut": p.debut, "fin": p.fin}
            for p in req.planning_existant
        ]
        resultat = planifier(req.taches, req.mode, req.date_debut, req.date_fin, planning_existant)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la planification: {str(e)}")
    
    return resultat


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "Organisateur d'emploi du temps API opérationnelle"}

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "etat_sauvegarde.json")

class SauvegardeRequest(BaseModel):
    taches: List[Tache]
    resultat: Any

@app.post("/api/sauvegarder")
async def sauvegarder_etat(req: SauvegardeRequest):
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(req.model_dump(), f, ensure_ascii=False, indent=2)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/etat")
async def charger_etat():
    if not os.path.exists(STATE_FILE):
        return {"taches": [], "resultat": None}
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
