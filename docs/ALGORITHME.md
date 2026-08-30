# Contribution — Rôle 2 · Moteur symbolique / Planification

> Document de contribution du rôle Moteur symbolique/Planification.
> Référence : `docs/ROLES_IMPLEMENTATION.md` §5.

## 1. Principes

Le raisonnement est **symbolique** (solveur de contraintes + règles explicites) : chaque décision et
chaque échec sont **explicables**, sans boîte noire.

## 2. Solveur de contraintes (`csp_solver.py`)

Signature : `resoudre_csp(taches, plannings_precedents=None) -> (planning | None, log_echecs)`.

Stratégie **hybride** :

1. **Vérification d'entrée** — toutes les tâches doivent partager la même date (sinon `ValueError`).
2. **Pré-réservation** — les créneaux de `plannings_precedents` (jours précédents / planning
   existant) sont marqués occupés.
3. **Horaires fixes** — validation de la plage `[08:00, 20:00]` + détection des chevauchements entre
   tâches fixes → échec avec log.
4. **Tâches libres** — tri **topologique** (dépendances) puis par **priorité décroissante**, puis
   placement **glouton** au premier créneau libre aligné sur 15 minutes, en respectant
   `PAUSE_MIN = 10`.
5. **Dépendances inter-jours** — `cross_day_min_start` ne démarre une tâche qu'après la fin (date +
   heure) de ses dépendances.
6. **Échec** — si des tâches ne sont pas placées : retour `(None, log_echecs)` avec, pour chaque
   échec, `{tache_id, creneau_teste, contrainte_violee}`.

## 3. Moteur de règles (`moteur_regles.py`)

Signature : `arbitrer(conflit: (Tache, Tache)) -> dict`.

| Situation | Décision |
|---|---|
| Priorités différentes | `resolu=True` : la moins prioritaire est décalée (ou retirée), `raison` explicative. |
| Priorités égales | `resolu=False` : `raison` + `options=[a.id, b.id]` (intervention humaine / rôle 3). |

Toute décision produit une **justification textuelle non vide**.

## 4. Complexité

- Tri topologique : `O(V + E)` (V = tâches, E = dépendances).
- Placement glouton par tâche : au plus `(durée_jour / 15 min)` positions testées, chacune en
  `O(n)` vis-à-vis des créneaux occupés. Globalement léger pour des journées typiques (< 30 tâches).

## 5. Tests

- `test_csp_solver.py` — 7 tests : simple, horaire fixe, hors plage, non-chevauchement, 3 fixes
  chevauchants (→ échec), dépendance même jour, liste vide.
- `test_moteur_regles.py` — 5 tests : arbitrages par priorité, cas égaux, raison non vide.
- **12 tests, tous au vert.**

## 6. Décisions & difficultés

- **Choix** : placement glouton plutôt qu'une recherche exhaustive — déterministe, rapide et
  suffisant pour les 10 cas du sujet (pas de combinatorialité explosive).
- **Piège** : les dépendances traversant les jours doivent comparer `date + heure`, sinon une tâche
  du lendemain pouvait passer avant sa dépendance de la veille.