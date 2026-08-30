# Plan d'implémentation — Organisation en 5 rôles (conforme au sujet)

> **Référentiel** : les 5 rôles **du sujet** — « indicatifs mais coopératifs : ce n'est pas un
> simple découpage en silos indépendants ». **Chaque rôle documente sa contribution** dans
> `docs/` (utile pour la partie individuelle de la note) ; la coordination est assurée par un
> contrat d'interfaces commun et des points d'intégration réguliers.

## 1. Matrice des 5 rôles

| # | Rôle (sujet) | Mission | Fichiers principaux | Livrable de documentation |
|---|--------------|---------|---------------------|---------------------------|
| **1** | **Formalisation / Connaissances** | Cadrer le problème et structurer les connaissances du domaine (modèle, contraintes, données) | `backend/src/modele.py`, `backend/src/import_donnees.py`, `backend/data/cas_test/*`, `backend/tests/test_import_donnees.py` | `docs/FORMALISATION.md` |
| **2** | **Moteur symbolique / Planification** | Développer le cœur logique/algorithmique du raisonnement | `backend/src/csp_solver.py`, `backend/src/moteur_regles.py`, `backend/tests/test_csp_solver.py`, `backend/tests/test_moteur_regles.py` | `docs/ALGORITHME.md` |
| **3** | **Incertitude / Apprentissage** | Gérer la dimension non déterministe : conflits indécidables, options, mémoire des décisions, pistes d'adaptation | `moteur_regles.py` (partie options, en coopération avec le rôle 2), `backend/data/etat_sauvegarde.json`, cas d'incertitude dans les tests | `docs/ANALYSE_INCERTITUDE_APPRENTISSAGE.md` |
| **4** | **Intégration / Interface** | Assembler les briques et fournir le moyen d'interagir avec le système | `backend/src/orchestrateur.py`, `backend/src/api.py`, `backend/requirements.txt`, `backend/tests/test_api.py`, `frontend/**` | `docs/GUIDE_INTEGRATION.md` |
| **5** | **Tests / Qualité** | Concevoir les cas de test et mener l'évaluation | `backend/tests/test_evaluation.py`, vision globale sur tous les `tests/`, `README.md` | `docs/SPEC_CAS_TEST.md`, `docs/RAPPORT_QUALITE.md` |

## 2. Flux de coopération

```
     1. Formalisation / Connaissances
        (problème, modèle Tache, données, contraintes)
                    │
                    ▼
     2. Moteur symbolique / Planification
        (solveur CSP + règles d'arbitrage)
        │                │
        ▼                ▼
 3. Incertitude      4. Intégration / Interface
   Apprentissage        (orchestrateur + API + frontend)
   options, mémoire     ▲                  │
        └───────────────┴──────────────────┘
                    │
                    ▼
     5. Tests / Qualité (évalue l'ensemble, revient vers chaque rôle)
```

Règles de coopération (pas de silos) :
- **Contrat commun** figé avant de coder (section 3) ; toute évolution est une décision d'équipe.
- Le rôle **3** s'appuie sur le moteur du rôle 2 (partie « non résolu / options »), et ses
  recommandations alimentent le rôle 4 (affichage des options) et le rôle 5 (cas d'incertitude).
- Le rôle **5** est transverse : il revoit chaque livrable, consolide les tests de tous les rôles
  et fournit le rapport d'évaluation.
- Git : une branche par rôle, revue croisée avant merge ; chaque rôle tient son journal dans
  `docs/CONTRIBUTIONS.md` (décisions, difficultés, fichiers touchés) pour la partie individuelle.

## 3. Contrats d'interfaces (communs, figés)

- **Rôle 1 → 2 / 3 / 4** : classe `Tache` (pydantic) et `charger_taches(path: str) -> list[Tache]`.
- **Rôle 2 → 3 / 4** :
  - `resoudre_csp(taches, plannings_precedents=None) -> (planning | None, log_echecs)` ;
  - `arbitrer(conflit) -> dict` (avec `resolu`, `tache_a_decaler`, `raison`, `options`).
- **Rôle 3 → 4** : contrat des « options » (conflits non résolus) + mémoire `data/etat_sauvegarde.json`.
- **Rôle 4 → 5 / frontend** : contrat JSON de l'API —
  `{ planning, decisions (avec raison), avertissements, echecs, taches_non_planifiees }`,
  endpoints `POST /api/importer`, `POST /api/planifier`, `GET /api/health`,
  `POST /api/sauvegarder`, `GET /api/etat`.

---

## 4. Rôle 1 — Formalisation / Connaissances

**Mission** : cadrer le problème (contraintes, hypothèses) et structurer les connaissances du domaine
(modèle, barème, données).

**Quoi faire, exactement :**

1. **`docs/FORMALISATION.md`** — formaliser le problème de planification : tâches, journées
   `08:00–20:00`, pas de 15 min, `PAUSE_MIN=10`, priorités `{urgent:3, important:2, flexible:1}`,
   contraintes (non-chevauchement, horaires fixes, dépendances intra/inter-jours), planification
   **par date**, échec = trace `{tache_id, creneau_teste, contrainte_violee}`.
2. **`modele.py`** — classe `Tache` (pydantic, avec validators de formats) + constantes + barème.
3. **`import_donnees.py`** — `charger_taches(path)` : JSON direct, CSV/Excel via pandas, défauts
   appliqués, erreurs **listant les lignes** invalides ; le format source ne fuit jamais.
4. **Fixtures** — `data/cas_test/cas_01…cas_10.json` (selon la spec du rôle 5) + `cas_01.csv` /
   `cas_01.xlsx` identiques au JSON.
5. **`tests/test_import_donnees.py`** — 10 tests unitaires (formats, équivalence, défauts, erreurs).

**Coopération** : fournit le contrat `Tache` aux rôles 2/3/4 ; répond aux questions de modèle ;
le rôle 5 valide ses fixtures contre la spec.

**Fini quand** : 10 tests verts ; cas 1 identique en 3 formats ; `FORMALISATION.md` livré.

---

## 5. Rôle 2 — Moteur symbolique / Planification

**Mission** : développer le cœur logique du raisonnement : solveur de contraintes + règles.

**Quoi faire, exactement :**

1. **`csp_solver.py`** — `resoudre_csp(...)` : mêmes dates ; pré-réservation de
   `plannings_precedents` ; horaires fixes validés dans `[08:00,20:00]` + conflits fixes détectés ;
   tâches libres triées (dépendances puis priorité décroissante) posées au premier créneau libre
   multiple de 15 min avec pause ; dépendances inter-jours comparées date+heure ; échec →
   `(None, log_echecs)` avec la **contrainte violée**.
2. **`moteur_regles.py`** — `arbitrer(conflit)` : priorités différentes → décale la moins
   prioritaire avec `raison` ; priorités égales → `resolu=False` + `options=[a.id, b.id]`
   (partie partagée avec le rôle 3).
3. **`docs/ALGORITHME.md`** — décrire l'algorithme (complexité, choix gloutons, topo-sort).
4. **Tests** — `test_csp_solver.py` (7) + `test_moteur_regles.py` (5).

**Coopération** : reçoit `Tache` (rôle 1) ; transmet `resoudre_csp`/`arbitrer` au rôle 4 ; la partie
« non résolu/options » est enrichie avec le rôle 3.

**Fini quand** : 12 tests verts ; cas 4 → échec loggé ; justifications non vides.

---

## 6. Rôle 3 — Incertitude / Apprentissage

**Mission** : gérer la dimension non déterministe et les pistes d'adaptation. Le système est
symbolique (pas de ML) : ce rôle rend l'incertitude **exploitable** et **mémorisable**.

**Quoi faire, exactement :**

1. **`docs/ANALYSE_INCERTITUDE_APPRENTISSAGE.md`** — recenser les sources d'incertitude
   (chevauchements de fixes, priorités égales, horaires hors plage, journée saturée) et les sorties
   associées (`echecs`, décisions `non_resolu`, `options`, avertissements) ; mesurer la robustesse
   sur les cas 4, 5, 8 et 10.
2. **Options** — en conflit de même priorité, garantir que l'arbitrage renvoie les **deux options**
   proposées à l'utilisateur (co-implémentation dans `moteur_regles.py` avec le rôle 2).
3. **Mémoire / apprentissage** — exploiter `data/etat_sauvegarde.json` (API sauvegarder/charger du
   rôle 4) : repriser un plan, réutiliser les décisions passées ; documenter comment les motifs de
   conflit répétés pourraient ajuster le barème (adaptation des règles).
4. **Cas d'incertitude** — fournir au rôle 5 les cas d'échec/indécision à intégrer à l'évaluation
   (surcharge, priorités égales, hors plage).

**Coopération** : consomme `arbitrer` (rôle 2) ; ses options sont affichées par le rôle 4 ;
ses cas alimentent l'évaluation du rôle 5.

**Fini quand** : analyse documentée ; options non vides en priorité égale ; mémoire démontrée
(sauvegarde → reprise) ; cas d'incertitude intégrés aux tests.

---

## 7. Rôle 4 — Intégration / Interface

**Mission** : assembler les briques (1 → 2 → 3) en une chaîne unique et fournir l'accès au système
(API + interface).

**Quoi faire, exactement :**

1. **`orchestrateur.py`** — `planifier(taches, mode, date_debut, date_fin, planning_existant=None)` :
   filtrer la plage, grouper par date, trier par priorité décroissante, boucle jour par jour avec
   `plannings_precedents` (dépendances inter-jours + créneaux immuables) ; mode `csp_seul` →
   résultat brut ; mode `csp_regles` → arbitrage itératif (retrait de la moins prioritaire) ;
   sortie conforme au contrat JSON (§3).
2. **`api.py`** — 5 endpoints (importer, planifier, health, sauvegarder, etat), CORS sur
   `localhost:3000`, mappage propre des erreurs (400/404/422/500).
3. **Frontend (interface)** — `lib/api.ts` (miroirs du contrat JSON) ; `ImportTaches` (drag & drop,
   prévisualisation, fusion) ; `SelecteurVue` (Jour/Semaine/Mois + date) ; `CalendrierVue` (3 vues,
   blocs par priorité, dark mode, clic → détail + justification) ; `PanneauDecisions`
   (decisions/avertissements/echecs + options) ; toggle `csp_seul`/`csp_regles` ; page scénarios
   (10 cas) ; route proxy Next.js → FastAPI.
4. **Tests d'intégration** — `test_api.py` (TestClient sur cas 1, 4, 9 + aller-retour sauvegarde).
5. **`docs/GUIDE_INTEGRATION.md`** — comment lancer (uvicorn, npm), schéma des flux, endpoints.

**Coopération** : consomme les briques des rôles 1/2/3 ; affiche les options du rôle 3 ;
s'appuie sur la spec du rôle 5 pour ses tests.

**Fini quand** : tests API verts ; uvicorn + Swagger OK ; build frontend vert ; parcours complet
sans rechargement.

---

## 8. Rôle 5 — Tests / Qualité

**Mission** : concevoir les cas de test, piloter l'évaluation, garantir les critères d'acceptation.

**Quoi faire, exactement :**

1. **`docs/SPEC_CAS_TEST.md`** — spécifier les 10 cas (scénario + **résultat attendu** : cas 1
   toutes placées, cas 2 arbitrage, cas 3 durée 30 par défaut, cas 4 échec, cas 5 non résolu avec
   options, cas 6 dépendance, cas 7 charge, cas 8 urgent prioritaire, cas 9 vide, cas 10 hors plage)
   + versions CSV/XLSX du cas 1. Cette spec pilote les fixtures du rôle 1.
2. **Consolider** — structurer les tests de tous les rôles (unitaires R1/R2/R3) et écrire
   **`test_evaluation.py`** : 10 cas sans exception ; cas 4 et 9 identifiés ; équivalence des
   formats sur le cas 1 ; divergence `csp_seul`/`csp_regles` sur les cas 2, 5 et 8 ; justifications
   non vides.
3. **Exécuter / mesurer** — `pytest tests/` + `pnpm run build` ; produire `docs/RAPPORT_QUALITE.md`
   (résultats, écarts éventuels, critères cochés) et le **`README.md`** (installation, lancement,
   endpoints, cas).
4. **Retours** — transmettre à chaque rôle les écarts observés et re-valider après correction.

**Coopération** : transverse, role « juge de paix » ; dialogue permanent avec les 4 autres.

**Fini quand** : `pytest` au vert (37+ tests), build frontend vert, critères d'acceptation tous
cochés, rapport + README livrés.

---

## 9. Déroulement coopératif & journal individuel

| Phase | Rôles actifs | Livrable |
|-------|--------------|----------|
| **1. Cadrage** | 1 + 5 | `FORMALISATION.md` + `SPEC_CAS_TEST.md` |
| **2. Modèle & données** | 1 (+5 valide) | modèle, import, fixtures, 10 tests |
| **3. Moteur** | 2 (+3 analyse) | solveur + règles, 12 tests, `ALGORITHME.md` |
| **4. Incertitude** | 3 (+2 co-implémente) | options, mémoire, analyse, cas d'incertitude |
| **5. Intégration** | 4 (+3 pour options, +5 pour spec) | orchestrateur, API, frontend, `GUIDE_INTEGRATION.md` |
| **6. Évaluation** | 5 (tous) | `pytest` + build + `RAPPORT_QUALITE.md` + README |

**Contribution individuelle** : chaque rôle tient son journal dans `docs/CONTRIBUTIONS.md`
(actions, décisions, difficultés, fichiers touchés, liens vers son document) — c'est la matière
de la partie individuelle de la note.

**Checklist de livraison par rôle :**

- [ ] **R1** : `FORMALISATION.md`, `modele.py`, `import_donnees.py`, `cas_01…10` + CSV/XLSX,
      `test_import_donnees.py` vert.
- [ ] **R2** : `csp_solver.py`, `moteur_regles.py`, `ALGORITHME.md`, 12 tests verts.
- [ ] **R3** : `ANALYSE_INCERTITUDE_APPRENTISSAGE.md`, options en priorité égale, mémoire démontrée,
      cas d'incertitude fournis.
- [ ] **R4** : `orchestrateur.py`, `api.py`, `test_api.py` verts, `frontend/**` build OK,
      `GUIDE_INTEGRATION.md`.
- [ ] **R5** : `SPEC_CAS_TEST.md`, `test_evaluation.py` vert, `RAPPORT_QUALITE.md`, `README.md`.
- [ ] **Tous** : journal rempli dans `docs/CONTRIBUTIONS.md`.