# Présentation — Rôle 5 · Tests / Qualité

> **Durée cible : 1 minute** (≈160 mots).
> Il clôt : il juge le système dans son ensemble, critères d'acceptation du sujet à l'appui.

## Script

Mon rôle est la **qualité** : concevoir les cas de test et évaluer le système de bout en bout.

J'ai écrit la **spécification des dix cas** du sujet — du planning simple sans conflit jusqu'à
l'horaire hors plage — avec le résultat attendu pour chacun, et un jeu multi-format pour le cas 1.

J'ai ensuite consolidé les tests unitaires des autres rôles et écrit l'**évaluation de bout en
bout** : elle vérifie que les trois formats d'import produisent les mêmes tâches, que les cas 4 et 9
sont correctement identifiés, que chaque décision d'arbitrage a une justification, et que les deux
modes de planification divergent bien sur les cas 2, 5 et 8.

Résultat : **37 tests au vert** sur le backend, build frontend sans erreur.

J'ai vérifié chaque **critère d'acceptation** du sujet, transmis mes retours aux autres rôles en
cours de route, et rédigé le **rapport de qualité** et le README du projet.

## Points à ne pas oublier à l'oral

- **37 tests verts** + build frontend = les preuves.
- Le test d'évaluation couvre **exactement les critères du sujet** (3 formats, 10 cas, modes,
  justifications).