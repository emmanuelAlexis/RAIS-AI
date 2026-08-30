# Contribution — Rôle 5 · Tests / Qualité — Spécification des cas de test

> Référence : `docs/ROLES_IMPLEMENTATION.md` §8. Pilote les fixtures du rôle 1.

## Les 10 cas

| Cas | Fichier | Scénario | Résultat attendu |
|---|---|---|---|
| 1 | `cas_01.json` (+ `.csv`, `.xlsx`) | 3 tâches sans conflit | Toutes placées ; **3 formats strictement équivalents** |
| 2 | `cas_02.json` | 2 tâches se chevauchent, priorités différentes | Arbitrage en `csp_regles` (la moins prioritaire décalée) ; `csp_seul` échoue |
| 3 | `cas_03.json` | Tâche sans `duree_min` | Défaut 30 min appliqué |
| 4 | `cas_04.json` | 3 `horaire_fixe` se chevauchent | **Échec attendu** (conflit fixe triple) |
| 5 | `cas_05.json` | 2 tâches même priorité, même créneau fixe | Non résolu en priorité égale → `options` proposées + justification |
| 6 | `cas_06.json` | Dépendance B après A | B planifié après la fin de A |
| 7 | `cas_07.json` | 11 tâches en une journée (charge) | Au moins certaines placées, aucune exception |
| 8 | `cas_08.json` | Tâche urgente ajoutée en conflit | Prioritaire en `csp_regles` ; résultats différents de `csp_seul` |
| 9 | `cas_09.json` | Liste vide | Résultat vide + avertissement |
| 10 | `cas_10.json` | `horaire_fixe` hors `08:00–20:00` | Échec attendu |

## Stratégie de test (pyramide)

1. **Unitaires** (rôles 1/2/3) : solveur (7), moteur de règles (5), import (10), incertitude.
2. **Intégration API** (rôle 4) : TestClient FastAPI — cas 1, 4, 9 + sauvegarde/chargement.
3. **Évaluation de bout en bout** (rôle 5) : l'ensemble des 10 cas au travers de
   `orchestrateur.planifier`, plus les vérifications transverses du sujet.

## Vérifications transverses (dans `test_evaluation.py`)

- 10 cas s'exécutent **sans exception** ; cas 4 et 9 correctement identifiés.
- Cas 1 : **équivalence JSON ↔ CSV ↔ XLSX** (mêmes `id`, `nom`, `duree_min`, `priorite`).
- **`csp_seul` ≠ `csp_regles`** sur les cas 2, 5, 8.
- Chaque décision d'arbitrage a une **`raison` non vide** (cas 2, 5, 8).

## Critères d'acceptation du sujet (rappel)

> Import JSON/CSV/Excel fonctionnel ; 10 cas sans exception ; justifications non vides ;
> `csp_seul` ≠ `csp_regles` sur 2, 5, 8 ; frontend avec vues jour/semaine/mois ;
> parcours complet sans rechargement de page.