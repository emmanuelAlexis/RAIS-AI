# Organisateur d'emploi du temps

Application fullstack de planification intelligente des tâches, combinant un solveur de contraintes (CSP) et un moteur de règles d'arbitrage.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Python 3.11+, FastAPI, `python-constraint`, `pandas`, `openpyxl`, `pytest` |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |

---

## Installation & Démarrage

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn src.api:app --reload
```

L'API sera disponible sur **http://localhost:8000**.

Documentation Swagger : http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface sera disponible sur **http://localhost:3000**.

---

## Lancement des tests

```bash
cd backend
# Tous les tests
pytest tests/ -v

# Tests d'évaluation uniquement
pytest tests/test_evaluation.py -v
```

---

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/importer` | Import fichier JSON / CSV / Excel → retourne `list[Tache]` |
| `POST` | `/api/planifier` | Planification CSP → retourne planning, décisions, avertissements, échecs |
| `GET` | `/api/health` | État de l'API |

### Exemple – Import

```bash
curl -X POST http://localhost:8000/api/importer \
  -F "file=@backend/data/cas_test/cas_01.json"
```

### Exemple – Planification

```bash
curl -X POST http://localhost:8000/api/planifier \
  -H "Content-Type: application/json" \
  -d '{
    "taches": [...],
    "mode": "csp_regles",
    "date_debut": "2026-09-01",
    "date_fin": "2026-09-07"
  }'
```

---

## Cas de test disponibles

| Cas | Description | Résultat attendu |
|-----|-------------|-----------------|
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

```
organisateur-emploi-du-temps/
├── backend/
│   ├── requirements.txt
│   ├── data/cas_test/         # 10 cas JSON + CSV + XLSX
│   ├── src/
│   │   ├── modele.py          # Modèle Tache + constantes
│   │   ├── import_donnees.py  # Parser JSON/CSV/Excel
│   │   ├── csp_solver.py      # Solveur CSP (python-constraint)
│   │   ├── moteur_regles.py   # Arbitrage de conflits
│   │   ├── orchestrateur.py   # Coordination CSP + règles
│   │   └── api.py             # Endpoints FastAPI
│   └── tests/
│       ├── test_csp_solver.py
│       ├── test_moteur_regles.py
│       ├── test_import_donnees.py
│       └── test_evaluation.py
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx               # Page principale
    │   │   └── api/planifier/route.ts # Proxy Next.js → FastAPI
    │   ├── components/
    │   │   ├── ImportTaches.tsx        # Drag & drop + prévisualisation
    │   │   ├── SelecteurVue.tsx        # Toggle Jour/Semaine/Mois + navigation
    │   │   ├── CalendrierVue.tsx       # Calendrier (3 vues)
    │   │   └── PanneauDecisions.tsx    # Accordéon décisions/avertissements/échecs
    │   └── lib/
    │       └── api.ts                  # Client HTTP vers FastAPI
    └── package.json
```
