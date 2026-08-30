# Présentation — Rôle 1 · Formalisation / Connaissances

> **Durée cible : 1 minute** (≈160 mots).
> C'est lui qui ouvre : il pose le cadre du problème avant que le moteur soit décrit.

## Script

Je me suis occupé de la **formalisation du problème** et de la **structuration des connaissances**
du domaine.

J'ai d'abord cadré le problème dans un document : des tâches à placer sur des journées de 8h à 20h,
par pas de quinze minutes, avec une pause minimale de dix minutes, trois niveaux de priorité et des
dépendances entre tâches.

J'ai ensuite défini le **modèle central** : la classe `Tache`, avec la validation des formats de date
et d'horaire, et le barème de priorités urgent / important / flexible. Toute la chaîne repose dessus.

J'ai écrit le **point d'entrée unique** des connaissances, `charger_taches` : JSON, CSV et Excel
sont lus sans que le reste du système connaisse le format source — valeurs manquantes → défauts,
lignes invalides → erreur explicite.

Enfin, j'ai produit les **dix jeux de données du sujet**, avec des versions CSV et Excel du cas 1
identiques au JSON.

Validé par **dix tests unitaires** : chaque format, équivalence entre formats, erreurs attendues.

## Points à ne pas oublier à l'oral

- Le **modèle `Tache` est la source de vérité** partagée par tous les autres rôles.
- Une **seule fonction d'entrée** (`charger_taches`) et une **identité garantie** entre les 3 formats.