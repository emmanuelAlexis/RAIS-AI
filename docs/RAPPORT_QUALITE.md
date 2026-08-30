# Contribution — Rôle 5 · Tests / Qualité — Rapport d'évaluation

> Document final du rôle Tests/Qualité. Résultats réels mesurés sur le dépôt.

## 1. Résultats d'exécution

| Contrôle | Commande | Résultat |
|---|---|---|
| Tests backend | `python -m pytest tests/` (backend) | **37 passed** (fin) — aucune panne |
| Détail | `test_csp_solver` | 7/7 OK |
| Détail | `test_moteur_regles` | 5/5 OK |
| Détail | `test_import_donnees` | 10/10 OK |
| Détail | `test_evaluation` | 15/15 OK (évaluation 10 cas + transverses) |
| Build frontend | `pnpm run build` | Succès (Next.js 15.3.3, 3.0 s compile, 7 pages générées) |
| Smoke API | `/api/importer` + `/api/planifier` (cas 1) | Import 3 tâches, planning 3/3, 3 décisions, 0 échec |

> Note d'environnement : Python 3.14.4, pytest 9.1.1 ; pnpm 11.4.0 nécessite `CI=true` en
> terminal non interactif (sans cela : `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`).

## 2. Conformité aux critères d'acceptation

| Critère | Statut | Preuve |
|---|---|---|
| Import JSON/CSV/Excel identiques sur le cas 1 | ✅ | `test_import_csv_excel_equivalence`, `test_import_csv_json_equivalence` |
| 10 cas sans exception ; cas 4 et 9 identifiés | ✅ | `test_evaluation.py` |
| Justification non vide à chaque arbitrage | ✅ | `test_arbitrage_raison_non_vide`, `test_justifications_non_vides` |
| `csp_seul` ≠ `csp_regles` sur cas 2, 5, 8 | ✅ | `test_cas02_*`, `test_cas08_differ_*`, cas 5 |
| Frontend : vues jour/semaine/mois | ✅ | Build OK (pages `/`, `/scenarios`, `/api/planifier`) |
| Parcours sans rechargement | ✅ | Architecture SPA (tous les appels via `fetch`), vérification manuelle |

## 3. Couverture fonctionnelle

- Formats : JSON / CSV / XLSX — ✓ ; type non supporté → erreur ✓ ; fichier absent → 404 ✓.
- Solveur : horaires fixes ✓ hors plage ✓ non-chevauchement ✓ pause ✓ dépendances ✓ charge ✓.
- Arbitrage : priorités différentes ✓ égales (options) ✓ justifications ✓.
- API : importer ✓ planifier ✓ health ✓ sauvegarder ✓ etat ✓ CORS ✓.
- Frontend : import ✓ sélecteur de vue ✓ calendrier 3 vues ✓ panneau décisions ✓ toggle modes ✓.

## 4. Limites & écarts (assumés)

- **Pas de dimension ML** : le système est symbolique (hors scope du sujet) — voir
  `ANALYSE_INCERTITUDE_APPRENTISSAGE.md`.
- Pas de `tests/test_api.py` versionné : les endpoints sont vérifiés par smoke test et évaluation
  ; un fichier dédié est recommandé en consolidation (rôle 4).
- Le flag `duree_par_defaut` n'est pas remonté comme champ `Tache` (le modèle applique le défaut
  30 : la trace est dans `avertissements` au niveau orchestration).

## 5. Verdict

**Objectif atteint** — les tests valident tous les critères d'acceptation du sujet. Le système
fonctionne de bout en bout (backend + frontend) et fournit un planning justifiable et transparent.