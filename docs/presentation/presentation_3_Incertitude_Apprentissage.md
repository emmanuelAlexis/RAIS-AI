# Présentation — Rôle 3 · Incertitude / Apprentissage

> **Durée cible : 1 minute** (≈160 mots).
> Il présente la dimension « non déterministe » du système : conflits, options, mémoire.

## Script

J'ai pris en charge la **dimension incertitude et apprentissage** du système.

J'ai d'abord recensé les sources d'incertitude : chevauchements d'horaires fixes, **arbitrages
indécidables** à priorité égale, horaires hors plage, journées saturées. Pour chacune, le système
produit une trace compréhensible : échec avec la contrainte violée, décision non résolue,
avertissement.

Sur ce point, j'ai fait un choix : à **priorité égale**, le système ne tranche pas arbitrairement —
il renvoie les **deux options à l'utilisateur**. C'est le comportement humble du système.

J'ai aussi mis en place la **mémoire** : la sauvegarde de l'état permet de reprendre une
planification et de réutiliser les décisions passées. C'est la base du volet apprentissage — je
documente comment les motifs de conflit répétés pourraient ajuster le barème de priorités.

Enfin, les cas d'incertitude sont intégrés à l'évaluation : options non vides en priorité égale,
échecs explicites, reprise après sauvegarde.

## Points à ne pas oublier à l'oral

- **Pas de tranchage arbitraire** en priorité égale → deux options proposées à l'utilisateur.
- **Mémoire des décisions** (`etat_sauvegarde.json`) = base du volet apprentissage.

## My own version:

Pour ma part, je me suis occupé de la gestion des cas incertains et de la mémoire du système.

J’ai surtout travaillé sur les situations où le système peut avoir plusieurs choix, par exemple lorsqu’il y a un conflit.

Dans ce cas, le système ne choisit pas au hasard : il propose les deux possibilités et laisse l’utilisateur décider.

J’ai aussi mis en place la sauvegarde de l’état, avec etat_sauvegarde.json, pour pouvoir reprendre une planification et garder les décisions précédentes.

Enfin, ces données peuvent servir plus tard à analyser les conflits répétitifs et améliorer les règles de priorité.
