# Journal des contributions individuelles

> Chaque membre complète sa section au fil du projet (une ligne par action).
> C'est la matière de la partie **individuelle** de la note :
> ce qui a été fait, pourquoi, comment, difficultés rencontrées, fichiers touchés.

## Rôle 1 — Formalisation / Connaissances

| Date | Action | Décision / difficulté | Fichiers |
|---|---|---|---|
| | Cadrage du problème (plage, pas 15 min, pause, priorités) | | `docs/FORMALISATION.md` |
| | Modèle `Tache` + barème + constantes | Validation des formats via pydantic | `src/modele.py` |
| | Point d'entrée unique `charger_taches` | pandas normalise les heures `HH:MM:SS` | `src/import_donnees.py` |
| | Jeux de données cas 01→10 (+ CSV/XLSX du cas 1) | 3 formats strictement identiques | `data/cas_test/*` |
| | Tests d'import (10) | | `tests/test_import_donnees.py` |

## Rôle 2 — Moteur symbolique / Planification

| Date | Action | Décision / difficulté | Fichiers |
|---|---|---|---|
| | Solveur : fixes (validation + conflits) puis glouton par priorité | Placement déterministe plutôt qu'exhaustif | `src/csp_solver.py` |
| | Dépendances inter-jours comparées date + heure | Piège : comparer seulement l'heure | `src/csp_solver.py` |
| | Log d'échec `{tache_id, creneau_teste, contrainte_violee}` | Transparence du raisonnement | `src/csp_solver.py` |
| | Moteur de règles : arbitrage + justifications | Priorités égales → `options` | `src/moteur_regles.py` |
| | Tests solveur (7) + règles (5) | | `tests/test_csp_solver.py`, `tests/test_moteur_regles.py` |

## Rôle 3 — Incertitude / Apprentissage

| Date | Action | Décision / difficulté | Fichiers |
|---|---|---|---|
| | Recensement des sources d'incertitude | Système symbolique assumé, pas de ML | `docs/ANALYSE_INCERTITUDE_APPRENTISSAGE.md` |
| | Conflits à priorité égale → options à l'utilisateur | Ne pas trancher arbitrairement | `src/moteur_regles.py` (avec rôle 2) |
| | Mémoire des décisions (sauvegarde/reprise) | | `data/etat_sauvegarde.json`, API sauvegarder/etat |
| | Pistes d'apprentissage documentées | Adaptation du barème, préférences | `docs/ANALYSE_INCERTITUDE_APPRENTISSAGE.md` |

## Rôle 4 — Intégration / Interface

| Date | Action | Décision / difficulté | Fichiers |
|---|---|---|---|
| | Orchestrateur : boucle jour par jour, modes csp_seul/csp_regles | `plannings_precedents` gère inter-jours | `src/orchestrateur.py` |
| | API FastAPI : 5 endpoints, CORS, erreurs mappées | | `src/api.py` |
| | Frontend : import, sélecteur de vue, calendrier 3 vues, panneau décisions | Blocs par priorité + dark mode | `frontend/src/components/*` |
| | Toggle csp_seul/csp_regles + page scénarios + proxy | | `frontend/src/app/*` |
| | Tests d'intégration (smoke API cas 1/4/9) | | `tests/` |

## Rôle 5 — Tests / Qualité

| Date | Action | Décision / difficulté | Fichiers |
|---|---|---|---|
| | Spécification des 10 cas + stratégie pyramidale de test | Résultats attendus figés | `docs/SPEC_CAS_TEST.md` |
| | Évaluation de bout en bout (10 cas, formats, modes, justifications) | | `tests/test_evaluation.py` |
| | Exécution : 37 tests verts + build frontend | pnpm exige `CI=true` sans TTY | — |
| | Rapport de conformité aux critères d'acceptation | | `docs/RAPPORT_QUALITE.md`, `README.md` |