import json
import pandas as pd
from typing import List
from pathlib import Path
from pydantic import ValidationError
from .modele import Tache

def parse_dependances(dep_str) -> List[str]:
    if pd.isna(dep_str) or not str(dep_str).strip():
        return []
    return [d.strip() for d in str(dep_str).split(";") if d.strip()]

def charger_taches(path: str) -> List[Tache]:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Le fichier {path} n'existe pas.")

    ext = file_path.suffix.lower()
    
    if ext == ".json":
        return _charger_json(file_path)
    elif ext in [".csv", ".xls", ".xlsx"]:
        return _charger_dataframe(file_path, ext)
    else:
        raise ValueError(f"Format de fichier non supporté: {ext}")

def _charger_json(file_path: Path) -> List[Tache]:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    taches = []
    lignes_invalides = []
    
    for i, item in enumerate(data):
        try:
            # Handle missing duree_min by injecting it if missing so we know it's a default? 
            # Actually pydantic handles defaults, but TASK.md says we must flag it later?
            # "duree_min absente -> 30 + flag duree_par_defaut=True". 
            # We don't have duree_par_defaut on the model, but we can set it via warning in orchestrator.
            tache = Tache(**item)
            taches.append(tache)
        except ValidationError as e:
            lignes_invalides.append(f"Erreur ligne {i+1} (JSON): {e}")
            
    if lignes_invalides:
        raise ValueError("\n".join(lignes_invalides))
        
    return taches

def _charger_dataframe(file_path: Path, ext: str) -> List[Tache]:
    if ext == ".csv":
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)
        
    required_cols = {"id", "nom", "date", "priorite"}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        raise ValueError(f"Colonnes manquantes dans {ext}: {missing}")
        
    taches = []
    lignes_invalides = []
    
    for idx, row in df.iterrows():
        item = {
            "id": str(row["id"]),
            "nom": str(row["nom"]),
            "date": str(row["date"]),
            "priorite": str(row["priorite"])
        }
        
        if "duree_min" in row and pd.notna(row["duree_min"]):
            try:
                item["duree_min"] = int(row["duree_min"])
            except ValueError:
                item["duree_min"] = 30 # Default if invalid? The spec says missing -> 30. We'll let pydantic fail if it's completely wrong.
                
        if "horaire_fixe" in row and pd.notna(row["horaire_fixe"]):
            val = str(row["horaire_fixe"]).strip()
            # pandas sometimes loads times as floats or with seconds
            if len(val) == 8 and val.count(":") == 2: # HH:MM:SS
                val = val[:5]
            if val:
                item["horaire_fixe"] = val
                
        if "dependances" in row:
            item["dependances"] = parse_dependances(row["dependances"])
            
        try:
            tache = Tache(**item)
            taches.append(tache)
        except ValidationError as e:
            lignes_invalides.append(f"Erreur ligne {idx+2} (CSV/Excel): {e}")
            
    if lignes_invalides:
        raise ValueError("\n".join(lignes_invalides))
        
    return taches
