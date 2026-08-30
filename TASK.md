# AGENT BRIEF — Implémentation complète : Organisateur d'emploi du temps

Implémente ce projet de A à Z, fichier par fichier, dans cet ordre. N'ajoute rien hors scope.

## Stack
- **Backend** : Python 3.11+, FastAPI (expose l'orchestrateur en API REST pour le frontend), `python-constraint`, `pytest`, `pandas` + `openpyxl` (lecture CSV/Excel)
- **Frontend** : Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Pas de deep learning, pas de base de données (état en mémoire/fichiers pour ce prototype)

## Arborescence à créer
```
organisateur-emploi-du-temps/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── data/cas_test/cas_01.json ... cas_10.json
│   ├── src/
│   │   ├── modele.py
│   │   ├── import_donnees.py
│   │   ├── csp_solver.py
│   │   ├── moteur_regles.py
│   │   ├── orchestrateur.py
│   │   └── api.py
│   └── tests/
│       ├── test_csp_solver.py
│       ├── test_moteur_regles.py
│       ├── test_import_donnees.py
│       └── test_evaluation.py
└── frontend/
    ├── package.json
    ├── app/
    │   ├── page.tsx
    │   └── api/planifier/route.ts        (proxy vers le backend si besoin CORS)
    ├── components/
    │   ├── ImportTaches.tsx
    │   ├── CalendrierVue.tsx
    │   ├── SelecteurVue.tsx               (jour / semaine / mois)
    │   └── PanneauDecisions.tsx
    └── lib/api.ts
```

## BACKEND

### 1. `src/modele.py`
- `Tache` : `id: str`, `nom: str`, `date: str` (format `YYYY-MM-DD`), `duree_min: int = 30`, `horaire_fixe: str | None` (format `HH:MM`), `plage_disponibilite: list[tuple[str,str]] | None`, `priorite: Literal["urgent","important","flexible"]`, `dependances: list[str] = []`
- Barème priorité : `{"urgent": 3, "important": 2, "flexible": 1}`
- Constantes : `HEURE_DEBUT="08:00"`, `HEURE_FIN="20:00"`, `PAUSE_MIN=10`
- La planification se fait **par date** : les tâches sont groupées par `date` avant d'être passées au CSP (pas de contrainte entre tâches de jours différents, sauf `dependances` qui peuvent traverser les dates — dans ce cas vérifier que la fin de la dépendance précède le début, même si dates différentes)

### 2. `src/import_donnees.py`
Fonction unique d'entrée : `charger_taches(path: str) -> list[Tache]`
- Détecte le format par l'extension : `.json`, `.csv`, `.xlsx`/`.xls`
- **JSON** : parsing direct, même structure que `Tache`
- **CSV/Excel** : colonnes attendues `id,nom,date,duree_min,horaire_fixe,priorite,dependances` (dependances = string séparée par `;`, ex `"t1;t2"`)
  - Utiliser `pandas.read_csv` / `pandas.read_excel`
  - Valeurs manquantes → appliquer les mêmes défauts que le JSON (`duree_min` absente → 30 + flag `duree_par_defaut=True`)
  - Valider le format de `date` (`YYYY-MM-DD`) et `horaire_fixe` (`HH:MM`), lever une erreur explicite listant les lignes invalides sinon
- Retourne toujours `list[Tache]`, quel que soit le format d'origine — le reste du système ne connaît jamais le format source

### 3. `src/csp_solver.py`
(inchangé dans la logique, mais opère sur un sous-ensemble de tâches filtré par date)
- Entrée : `list[Tache]` déjà filtrées sur une ou plusieurs dates
- Variables = tâches, domaine = créneaux 15 min entre `HEURE_DEBUT` et `HEURE_FIN`, **par date**
- Contraintes dures : pas de chevauchement (même date uniquement), respect `horaire_fixe`, `PAUSE_MIN`, `dependances` (avec comparaison date+heure)
- À chaque échec : log `{"tache_id", "creneau_teste", "contrainte_violee"}`
- Retour : `(planning: dict[str, tuple[str,str,str]] | None, log_echecs: list[dict])` où le tuple est `(date, debut, fin)`
- Si aucune solution : identifier le sous-ensemble minimal de tâches en conflit

### 4. `src/moteur_regles.py`
Identique à la version précédente :
- `arbitrer(conflit: tuple[Tache, Tache]) -> dict`
- Priorités différentes → décale la moins prioritaire, justification via template
- Priorités égales → `{"resolu": False, "raison": "...", "options": [a.id, b.id]}`

### 5. `src/orchestrateur.py`
Fonction `planifier(taches: list[Tache], mode: Literal["csp_seul","csp_regles"], date_debut: str, date_fin: str) -> dict`
- Filtre les tâches dans `[date_debut, date_fin]`
- Groupe par date, appelle le CSP par jour
- Arbitrage règles si `mode == "csp_regles"`
- Sortie JSON :
```json
{
  "planning": [{"id": "t1", "nom": "...", "date": "2026-09-01", "debut": "14:00", "fin": "15:00"}],
  "decisions": [
    {"etape": "placement_csp", "tache_id": "t3", "resultat": "place", "date": "2026-09-01", "creneau": "16:00-17:00", "raison": "..."},
    {"etape": "arbitrage_regles", "tache_id": "t2", "resultat": "decalee", "raison": "..."}
  ],
  "avertissements": ["t4: duree non precisee, valeur par defaut 30 min appliquee"],
  "echecs": [{"taches": ["t5","t6","t7"], "raison": "trois contraintes fixes se chevauchent"}]
}
```

### 6. `src/api.py` (FastAPI)
Endpoints :
- `POST /api/importer` — reçoit un fichier (`multipart/form-data`, JSON/CSV/Excel), retourne `list[Tache]` parsées (pour prévisualisation côté frontend avant planification)
- `POST /api/planifier` — reçoit `{taches: Tache[], mode: string, date_debut: string, date_fin: string}`, retourne la sortie de `orchestrateur.planifier`
- CORS ouvert sur `http://localhost:3000` pour le dev
- Lancement : `uvicorn src.api:app --reload`

### 7. Cas de test — `data/cas_test/cas_01.json` à `cas_10.json`
Mêmes 10 cas que précédemment (voir liste ci-dessous), chacun avec un champ `date` ajouté à chaque tâche. Fournir en plus **une version CSV et une version Excel du cas 1** (`cas_01.csv`, `cas_01.xlsx`) pour tester l'import multi-format.

1. Planning simple sans conflit
2. Deux tâches se chevauchent, priorités différentes
3. Tâche sans `duree_min`
4. Trois tâches `horaire_fixe` qui se chevauchent (échec attendu)
5. Deux tâches même priorité, même créneau fixe
6. Dépendance entre tâches (B après A)
7. 10+ tâches sur une même journée (charge)
8. Tâche urgente ajoutée en dernier, en conflit
9. Liste vide
10. `horaire_fixe` hors plage `08:00-20:00`

### 8. `tests/test_evaluation.py`
Identique à la version précédente + vérifie que l'import CSV/Excel du cas 1 produit exactement les mêmes `Tache` que le JSON équivalent.

### 9. `tests/test_import_donnees.py`
Tests unitaires : import JSON valide, import CSV valide, import Excel valide, fichier avec ligne invalide (date mal formée) → erreur explicite, valeurs manquantes → défauts appliqués.

## FRONTEND (Next.js + Tailwind + shadcn/ui)

### 10. Composants attendus

**`components/ImportTaches.tsx`**
- Zone de dépôt de fichier (JSON/CSV/Excel) — utiliser un composant shadcn `Input type="file"` ou un dropzone simple
- Envoie le fichier à `POST /api/importer`, affiche un tableau shadcn (`Table`) de prévisualisation des tâches importées avant validation

**`components/SelecteurVue.tsx`**
- Sélecteur shadcn (`Tabs` ou `ToggleGroup`) avec 3 options : Jour / Semaine / Mois
- Un sélecteur de date (shadcn `Calendar` en popover, ou `DatePicker`) pour choisir la date/semaine/mois de référence — c'est cette date qui définit `date_debut`/`date_fin` envoyés à `/api/planifier`

**`components/CalendrierVue.tsx`**
- Rendu du planning reçu, adapté selon la vue sélectionnée :
  - **Jour** : colonne unique avec créneaux horaires 08:00–20:00, blocs positionnés selon `debut`/`fin`
  - **Semaine** : grille 7 colonnes (une par jour) × créneaux horaires
  - **Mois** : grille de type calendrier mensuel (cases par jour), chaque case liste les tâches du jour (nom + heure, sans détail de layout précis)
- Chaque bloc de tâche est cliquable → ouvre un détail (nom, horaire, priorité, justification associée si décision d'arbitrage)
- Style Tailwind : blocs colorés par priorité (ex. urgent = rouge/rose, important = ambre, flexible = gris), coins arrondis, pas de couleurs codées en dur incompatibles avec le dark mode si le projet en a un

**`components/PanneauDecisions.tsx`**
- Liste shadcn (`Accordion` ou `Card` empilées) des `decisions`, `avertissements`, `echecs` reçus de l'API, en texte lisible (réutiliser directement les champs `raison`)

**`app/page.tsx`**
- Assemble les 4 composants : import → sélection vue/date → appel `/api/planifier` → affichage calendrier + panneau décisions
- Toggle pour choisir le mode (`csp_seul` / `csp_regles`) — utile pour la démo comparant les deux configurations

**`lib/api.ts`**
- Fonctions `importerFichier(file: File)` et `planifier(taches, mode, dateDebut, dateFin)` qui appellent le backend FastAPI (`fetch`)

## README.md
Sections : description, installation backend (`pip install -r requirements.txt`, `uvicorn src.api:app --reload`), installation frontend (`npm install`, `npm run dev`), lancement des tests (`pytest`), lancement de l'évaluation (`python -m tests.test_evaluation`).

## Critères d'acceptation
- Import fonctionnel pour JSON, CSV et Excel, avec résultats identiques sur le cas 1 dans les 3 formats
- Les 10 cas de test s'exécutent sans exception ; cas 4 et 9 correctement identifiés
- Chaque décision d'arbitrage produit une justification textuelle non vide
- `csp_seul` et `csp_regles` donnent des résultats différents sur au moins les cas 2, 5, 8
- Le frontend affiche correctement un planning en vue jour, semaine et mois à partir d'une date choisie par l'utilisateur
- L'import de fichier, le calcul du planning et l'affichage des décisions fonctionnent de bout en bout sans rechargement de page