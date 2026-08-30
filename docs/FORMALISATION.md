# Contribution — Rôle 1 · Formalisation / Connaissances

> Document de contribution du rôle Formalisation/Connaissances.
> Référence : `docs/ROLES_IMPLEMENTATION.md` §4.

## 1. Le problème formalisé

**Planification d'emploi du temps** : placer un ensemble de tâches sur des créneaux de **15 minutes**
à l'intérieur de journées de **08:00 à 20:00**, en respectant des contraintes dures et en maximisant
la priorité des tâches placées.

- **Tâche** : identifiant, nom, date (`YYYY-MM-DD`), durée, horaire fixe éventuel (`HH:MM`), plage(s)
  de disponibilité, priorité, dépendances.
- **Priorités** : `urgent = 3`, `important = 2`, `flexible = 1`.
- **Constantes** : `HEURE_DEBUT = "08:00"`, `HEURE_FIN = "20:00"`, `PAUSE_MIN = 10`.
- **Granularité** : créneaux de 15 minutes (durées arrondies au multiple supérieur).

## 2. Connaissances structurées (modèle)

Classe centrale `Tache` (pydantic) : validations de format sur `date` et `horaire_fixe`,
`dependances` en liste, `duree_min` par défaut à 30. C'est la **source de vérité** consommée par
tous les autres rôles.

## 3. Contraintes (connaissances dures du domaine)

| Contrainte | Définition |
|---|---|
| Non-chevauchement | Deux tâches d'une même date ne peuvent pas se chevaucher (avec la pause de 10 min). |
| Horaire fixe | Une tâche `horaire_fixe` doit être placée exactement à son horaire. |
| Plage de travail | Toutes les tâches dans `[08:00, 20:00]`. |
| Dépendance intra-jour | La dépendance finit avant le début de la tâche suivante. |
| Dépendance inter-jours | Comparaison **date + heure** (ex. B le lendemain d'A). |
| Planification par date | Les tâches sont groupées par date avant résolution. |

## 4. Ingestion des connaissances (import)

`charger_taches(path)` : détection par extension — `.json` (lecture directe), `.csv`/`.xlsx`/`.xls`
(via `pandas`). Valeurs manquantes → défauts (`duree_min` → 30) ; lignes invalides → erreurs
explicites **listant les lignes**. Le reste du système ne connaît jamais le format source.

## 5. Jeux de données produits

`cas_01` … `cas_10` (conforme à `docs/SPEC_CAS_TEST.md`), + `cas_01.csv` et `cas_01.xlsx`
**identiques** au JSON (équivalence garantie par les tests).

## 6. Tests & validation

`backend/tests/test_import_donnees.py` — 10 tests unitaires : formats valides, équivalence
JSON↔CSV↔XLSX, défauts, liste vide, fichier inexistant, format non supporté, date invalide.

## 7. Décisions & difficultés

- **Choix** : toute la chaîne repose sur un modèle unique (`Tache`) pour éviter les conversions.
- **Piège rencontré** : pandas convertit les heures en `HH:MM:SS` ou en float → normalisation
  nécessaire à l'import avant validation pydantic.