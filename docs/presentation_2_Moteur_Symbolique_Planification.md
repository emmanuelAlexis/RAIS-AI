# Présentation — Rôle 2 · Moteur symbolique / Planification

> **Durée cible : 1 minute** (≈160 mots).
> Il présente le cœur logique/algorithmique, juste après la formalisation.

## Script

Je suis responsable du **cœur symbolique du raisonnement** : le solveur de contraintes et le moteur
de planification.

Le solveur place les tâches sur des **créneaux de quinze minutes**, de 8h à 20h. Les tâches à
**horaire fixe** sont posées telles quelles et leurs chevauchements sont détectés. Les autres sont
triées par dépendances puis par priorité, et placées au premier créneau libre, avec une **pause de
dix minutes**. Les dépendances inter-jours sont comparées en date et heure. Chaque échec est loggé
avec la **contrainte violée**, ce qui rend le raisonnement transparent.

Le **moteur de règles** arbitre les conflits : quand les priorités diffèrent, la tâche la moins
prioritaire est décalée avec une **justification** ; à priorités égales, l'arbitrage est déclaré
non résolu et deux options sont proposées — c'est le passage au rôle incertitude.

Couvert par **douze tests verts**, dont le cas 4 du sujet, où trois horaires fixes se chevauchent et
échouent comme prévu.

## Points à ne pas oublier à l'oral

- **Raisonnement symbolique explicable** : chaque échec est loggé avec la contrainte violée.
- **12 tests verts** + interface claire avec les rôles incertitude et intégration.