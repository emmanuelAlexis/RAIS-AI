# Présentation — Rôle 4 · Intégration / Interface

> **Durée cible : 1 minute** (≈160 mots).
> Il relie les algorithmes au monde réel : assemble les briques et montre l'interface.

## Script

Je me suis occupé de l'**assemblage** des briques et de l'**interface** qui permet de piloter le
système.

L'**orchestrateur** enchaîne le travail : il filtre les tâches, les groupe par jour et appelle le
solveur **jour par jour**, en cumulant les jours précédents pour les dépendances inter-jours. Deux
modes sont disponibles : `csp_seul`, resultat brut, et `csp_regles`, qui déclenche l'arbitrage et
retire la tâche la moins prioritaire jusqu'au planning final. La sortie est un JSON unifié :
planning, **décisions justifiées**, avertissements, échecs et tâches non planifiées.

J'ai exposé **cinq endpoints FastAPI** : import, planification, état de santé, sauvegarde et reprise.

Et côté **interface utilisateur** : import par glisser-déposer avec prévisualisation, **trois vues**
— jour, semaine, mois — des blocs colorés par priorité, le panneau des décisions, et le basculement
entre les deux modes.

Le tout fonctionne de bout en bout **sans recharger la page**, et le build passe.

## Points à ne pas oublier à l'oral

- **5 endpoints FastAPI** + contrat JSON documenté pour le frontend.
- **3 vues** (jour / semaine / mois) + modes `csp_seul` / `csp_regles` + bout-en-bout.