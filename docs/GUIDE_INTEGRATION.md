# Contribution — Rôle 4 · Intégration / Interface

> Document de contribution du rôle Intégration/Interface.
> Référence : `docs/ROLES_IMPLEMENTATION.md` §7.

## 1. Chaîne de traitement intégrée

```
Import (fichier) → charger_taches → Tache[] → orchestrateur.planifier()
   par date → resoudre_csp (+ arbitrer en mode csp_regles) → contrat JSON → frontend
```

## 2. Orchestrateur (`orchestrateur.py`)

`planifier(taches, mode, date_debut, date_fin, planning_existant=None)` :

1. Filtre les tâches dans `[date_debut, date_fin]` (vide → réponse + avertissement).
2. Groupe par date, trie chaque jour par priorité décroissante.
3. Boucle **jour par jour** : `plannings_precedents` cumule les plannings des jours précédents
   (dépendances inter-jours) + les créneaux immuables de `planning_existant`.
4. Mode **`csp_seul`** : solution CSP brute (ou échecs). Mode **`csp_regles`** : en cas d'échec,
   boucle d'arbitrage — retire la tâche la moins prioritaire, journalise la décision et
   l'avertissement, jusqu'à obtenir un planning.
5. Sortie : `{planning, decisions, avertissements, echecs, taches_non_planifiees}`.

## 3. API REST (`api.py`, FastAPI)

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/importer` | POST | Fichier multipart (JSON/CSV/XLSX) → `list[Tache]` |
| `/api/planifier` | POST | `{taches, mode, date_debut, date_fin, planning_existant}` → contrat JSON |
| `/api/health` | GET | État de l'API |
| `/api/sauvegarder` | POST | Persiste l'état dans `data/etat_sauvegarde.json` |
| `/api/etat` | GET | Recharge l'état sauvé |

- CORS ouvert sur `http://localhost:3000` (dev).
- Erreurs mappées proprement : 400 (extension), 404 (fichier), 422 (données invalides),
  500 (interne).

## 4. Frontend (interface utilisateur)

- **`lib/api.ts`** : types miroirs du contrat JSON + `importerFichier`, `planifier`,
  `sauvegarderEtat`, `chargerEtat`.
- **`ImportTaches`** : drag & drop, prévisualisation, fusion par `id`, annulation.
- **`SelecteurVue`** : Jour / Semaine / Mois + date de référence → `date_debut`/`date_fin`.
- **`CalendrierVue`** : 3 vues (colonne horaire, grille 7 jours, cases mensuelles), blocs par
  priorité, mode sombre, clic → détail + justification.
- **`PanneauDecisions`** : décisions/avertissements/échecs/tâches non planifiées en clair.
- **Toggle `csp_seul`/`csp_regles`**, page `scenarios` (10 cas), proxy `api/planifier/route.ts`
  (Next.js → FastAPI).

## 5. Lancement (extrait du README)

```bash
cd backend && pip install -r requirements.txt && uvicorn src.api:app --reload   # :8000
cd frontend && pnpm install && pnpm run dev                                   # :3000
```

## 6. Tests d'intégration

`backend/tests/test_api.py` (TestClient) : import 3 formats, planification cas 1 (3/3), cas 4
(échecs non vides), cas 9 (vide), aller-retour sauvegarde/chargement. API bootable via
`uvicorn` + Swagger sur `/docs`.