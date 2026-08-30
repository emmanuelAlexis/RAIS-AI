# Backend — Organisateur d'emploi du temps

API de planification intelligente de tâches combinant un **solveur de contraintes (CSP)** et un **moteur de règles d'arbitrage**.

Ce backend est une API REST **FastAPI** consommée par le frontend Next.js du dépôt racine.

---

## Prérequis

| Outil | Version requise |
|-------|-----------------|
| Python | **3.11 ou plus récent** (testé jusqu'à 3.14) |
| pip | Inclus avec Python (vérifiable avec `python -m pip --version`) |

> 💡 Sur Windows, les programmes d'installation Python fournissent généralement le lanceur `py`. Les commandes ci-dessous utilisent `py` sur Windows et `python3` sur Linux / macOS — adaptez selon votre environnement.

---

## Installation

### 1. Créer un environnement virtuel

Créez l'environnement **à la racine du dossier `backend/`** afin que les chemins relatifs (`data/`, `src/`) fonctionnent.

**Windows (PowerShell / CMD) :**

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> Si l'activation PowerShell est bloquée, lancez : `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` puis réessayez. En CMD : `.\.venv\Scripts\activate.bat`.

**Linux / macOS :**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

L'invite de commande doit afficher `(.venv)` en préfixe, signe que l'environnement est actif.

### 2. Installer les dépendances

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Dépendances installées :

| Package | Rôle |
|---------|------|
| `fastapi` + `uvicorn` | API REST et serveur |
| `pydantic` | Modèles et validation des données |
| `python-constraint` | Solveur CSP (contraintes) |
| `pandas` + `openpyxl` | Import JSON / CSV / Excel |
| `python-multipart` | Réception de fichiers (multipart) |
| `pytest` | Tests |

---

## Démarrage

Depuis `backend/` (environnement virtuel actif) :

```bash
uvicorn src.api:app --reload
```

- API : **http://localhost:8000**
- Documentation interactive (Swagger UI) : **http://localhost:8000/docs**
- Documentation OpenAPI (JSON) : **http://localhost:8000/openapi.json**

> 🚨 Le CORS n'autorise que `http://localhost:3000` (voir `src/api.py`). La page frontend doit tourner sur ce port pour appeler l'API directement.

---

## Tests

Depuis `backend/` (environnement virtuel actif) :

```bash
# Tous les tests
pytest tests/ -v

# Équivalent avec python -m
python -m pytest tests/ -v

# Un fichier de test spécifique
pytest tests/test_evaluation.py -v
```

Les tests couvrent le solveur CSP, le moteur de règles, les imports de fichiers et l'évaluation complète des 10 cas de test de `data/cas_test/`.

---

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | État de l'API |
| `POST` | `/api/importer` | Import fichier JSON / CSV / Excel (multipart) → `list[Tache]` |
| `POST` | `/api/planifier` | Planification CSP + règles → planning, décisions, avertissements, échecs |
| `POST` | `/api/sauvegarder` | Persiste l'état (`taches` + `resultat`) dans `data/etat_sauvegarde.json` |
| `GET` | `/api/etat` | Charge l'état sauvegardé (`{ taches, resultat }`) |

---

### Exemple — Import de fichier

**Windows PowerShell (curl.exe) :**

```powershell
curl.exe -X POST http://localhost:8000/api/importer -F "file=@data/cas_test/cas_01.json"
```

**Linux / macOS :**

```bash
curl -X POST http://localhost:8000/api/importer \
  -F "file=@data/cas_test/cas_01.json"
```

Formats acceptés : `.json`, `.csv`, `.xls`, `.xlsx`.

### Exemple — Planification

```json
{
  "taches": [
    {
      "id": "t1",
      "nom": "Réunion équipe",
      "date": "2026-09-01",
      "duree_min": 60,
      "horaire_fixe": null,
      "plage_disponibilite": null,
      "priorite": "important",
      "dependances": []
    },
    {
      "id": "t2",
      "nom": "Rédaction rapport",
      "date": "2026-09-01",
      "duree_min": 90,
      "horaire_fixe": null,
      "plage_disponibilite": null,
      "priorite": "urgent",
      "dependances": []
    }
  ],
  "mode": "csp_regles",
  "date_debut": "2026-09-01",
  "date_fin": "2026-09-07",
  "planning_existant": []
}
```

```bash
curl -X POST http://localhost:8000/api/planifier \
  -H "Content-Type: application/json" \
  -d @planification.json
```

**Valeurs de `mode` :**

| Mode | Comportement |
|------|--------------|
| `csp_seul` | Contraintes pures via `python-constraint`. Échec si aucune solution. |
| `csp_regles` | CSP puis arbitrage des conflits par le moteur de règles (priorités : urgent > important > flexible). |

### Réponse de planification

```json
{
  "planning": [
    { "id": "t1", "nom": "Réunion équipe", "date": "2026-09-01", "debut": "09:00", "fin": "10:00", "priorite": "important" }
  ],
  "decisions": [
    { "etape": "placement_csp", "tache_id": "t1", "resultat": "place", "date": "2026-09-01", "creneau": "09:00-10:00", "raison": "..." }
  ],
  "avertissements": [],
  "echecs": [],
  "taches_non_planifiees": []
}
```

---

## Modèle de données — `Tache`

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `id` | `str` | — | Identifiant unique |
| `nom` | `str` | — | Libellé de la tâche |
| `date` | `str` | — | Date ISO `YYYY-MM-DD` |
| `duree_min` | `int` | `30` | Durée en minutes |
| `horaire_fixe` | `str \| null` | `null` | Heure imposée `HH:MM` |
| `plage_disponibilite` | `[[str, str]] \| null` | `null` | Fenêtres de disponibilité |
| `priorite` | `"urgent" \| "important" \| "flexible"` | — | Priorité |
| `dependances` | `list[str]` | `[]` | IDs des tâches devant être planifiées avant |

La journée de travail est bornée de **08:00 à 20:00** avec une pause minimale de **10 min** entre deux créneaux (constantes dans `src/modele.py`).

---

## Cas de test — `data/cas_test/`

| Cas | Description | Résultat attendu |
|-----|-------------|------------------|
| `cas_01` | Planning simple, 3 tâches sans conflit | Toutes placées |
| `cas_02` | Deux tâches chevauchantes, priorités différentes | Arbitrage en mode `csp_regles` |
| `cas_03` | Tâche sans `duree_min` | Valeur par défaut 30 min appliquée |
| `cas_04` | 3 `horaire_fixe` se chevauchant | Échec attendu |
| `cas_05` | Même priorité, même créneau | Non résolu, options proposées |
| `cas_06` | Dépendance B → A | B planifié après A |
| `cas_07` | 11 tâches en une journée | Toutes placées si possible |
| `cas_08` | Tâche urgente en conflit | Urgente prioritaire |
| `cas_09` | Liste vide | Résultat vide |
| `cas_10` | `horaire_fixe` hors plage 08h–20h | Échec attendu |

Formats disponibles pour le cas 1 : `cas_01.json`, `cas_01.csv`, `cas_01.xlsx`.

---

## Structure du projet

```text
backend/
├── requirements.txt          # Dépendances Python
├── data/
│   ├── cas_test/             # 10 cas de test (JSON / CSV / XLSX)
│   └── etat_sauvegarde.json  # État persisté par /api/sauvegarder (généré)
├── src/
│   ├── api.py                # Endpoints FastAPI + CORS + persistance
│   ├── modele.py             # Modèle Tache + constantes (08h-20h, pauses)
│   ├── import_donnees.py     # Parseur JSON / CSV / Excel
│   ├── csp_solver.py         # Solveur CSP (python-constraint)
│   ├── moteur_regles.py      # Arbitrage des conflits par priorité
│   └── orchestrateur.py      # Coordination CSP + règles, jour par jour
└── tests/
    ├── test_csp_solver.py
    ├── test_moteur_regles.py
    ├── test_import_donnees.py
    └── test_evaluation.py    # Évaluation sur les 10 cas
```

---

## Notes

- L'état sauvegardé (`POST /api/sauvegarder` → `GET /api/etat`) est stocké dans `data/etat_sauvegarde.json`.
- Le mode `csp_regles` est le mode utilisé par défaut dans l'interface.
- Le fichier `data/etat_sauvegarde.json` est généré au fil de l'utilisation ; il n'est pas versionné.