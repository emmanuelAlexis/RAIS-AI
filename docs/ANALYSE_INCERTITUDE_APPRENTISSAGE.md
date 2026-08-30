# Contribution — Rôle 3 · Incertitude / Apprentissage

> Document de contribution du rôle Incertitude/Apprentissage.
> Référence : `docs/ROLES_IMPLEMENTATION.md` §6.

## 1. Sources d'incertitude recensées

| Source | Manifestation système | Cas de test lié |
|---|---|---|
| Chevauchement d'horaires fixes | Échec CSP, log `contrainte_violee` | cas 4 |
| Priorités égales sur un même créneau | Arbitrage `resolu=False` + `options` | cas 5 |
| Horaire hors plage `[08:00,20:00]` | Échec explicite | cas 10 |
| Journée saturée (charge) | Tâches non planifiées, avertissements | cas 7 |
| Tâche urgente en conflit | Décision d'arbitrage prioritaire | cas 8 |
| Absence de données | Planning vide + avertissement | cas 9 |

## 2. Comportement « humble » du système

À **priorité égale** sur un même créneau, le système **refuse de trancher arbitrairement** : il
renvoie les deux options à l'utilisateur (`options=[a.id, b.id]`) avec une justification, plutôt que
de faire un choix arbitraire indéfendable. Cette indécision est tracée dans le contrat JSON
(`decisions` avec `resultat: "non_resolu"`).

## 3. Mémoire / apprentissage

La **mémoire du système** est `backend/data/etat_sauvegarde.json`, exposée par les endpoints
`POST /api/sauvegarder` et `GET /api/etat` (rôle 4). Elle permet de :
- reprendre une planification existante (`planning_existant` = contraintes immuables) ;
- conserver les décisions passées entre deux sessions.

**Pistes d'apprentissage documentées** (au-delà du prototype) :
1. **Adaptation du barème** : si le même couple de tâches entre en conflit à répétition, ajuster les
   scores (`PRIORITES_BAREME`) ou proposer un décalage systématique.
2. **Apprentissage des préférences** : tirer parti des choix manuels de l'utilisateur (options
   choisies) pour classer les priorités à la prochaine planification.
3. **Relaxation guidée** : proposer des plages de disponibilité alternatives quand une date sature ;
   mesurer le taux de placement pour détecter les journées « à risque ».

## 4. Limites assumées

Le système est **symbolique, non probabiliste** : pas de ML ni de modélisation stochastique (hors
scope du sujet). L'« apprentissage » se limite à la mémorisation et à des règles d'adaptation
documentées — cette limite est un choix assumé et tracé ici.

## 5. Contribution aux tests

Cas d'incertitude fournis au rôle 5 : priorités égales → `options` non vide ; triple chevauchement
de fixes → échec ; hors plage → échec ; aller-retour sauvegarde → reprise. Vérifiés dans
`backend/tests/test_moteur_regles.py`, `test_evaluation.py` (cas 4, 5, 8, 10) et via l'API
(sauvegarder/charger).