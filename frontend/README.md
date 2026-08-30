# Frontend — Organisateur d'emploi du temps

Interface web de l'**Organisateur d'emploi du temps** : import de tâches, planification intelligente (CSP + moteur de règles), calendrier interactif (Jour / Semaine / Mois) et **banc de test de scénarios**.

Ce frontend est une application **Next.js 15** (App Router) qui consomme l'API FastAPI du backend (`../backend`).

---

## Prérequis

| Outil | Version requise |
|-------|-----------------|
| Node.js | **20 LTS ou plus récent** |
| Gestionnaire de paquets | **pnpm** (recommandé, verrouillé par `pnpm-lock.yaml`) — npm / yarn fonctionnent aussi |

> 💡 Installer pnpm : `npm install -g pnpm` ou via Corepack (`corepack enable`).

---

## Installation

```bash
cd frontend
pnpm install
```

> Si vous préférez npm : `npm install`. Les scripts restent identiques (voir ci-dessous).

---

## Démarrage

### 1. Lancer le backend (API)

Le frontend a besoin de l'API backend sur **http://localhost:8000**. Démarrez-le d'abord (voir [`../backend/README.md`](../backend/README.md)) :

```bash
cd backend
# (avec l'environnement virtuel actif)
uvicorn src.api:app --reload
```

### 2. Lancer le frontend

```bash
cd frontend
pnpm dev
```

Puis ouvrez :

| Page | URL |
|------|-----|
| Organisateur (import + planification + calendrier) | http://localhost:3000 |
| Banc de test Scénarios | http://localhost:3000/scenarios |

Le serveur de développement (Turbopack) recharge à chaud les modifications.

---

## Configuration — Variables d'environnement

Créez un fichier `.env.local` à la racine de `frontend/` si vous devez changer l'URL de l'API :

```env
# URL de l'API backend appelée directement par le client (défaut : http://localhost:8000)
NEXT_PUBLIC_API_URL=http://localhost:8000

# URL du backend pour le proxy Next.js (`src/app/api/planifier/route.ts`) — optionnel
BACKEND_URL=http://localhost:8000
```

Les deux variables ont des valeurs par défaut (`http://localhost:8000`) : aucun `.env.local` n'est donc nécessaire pour un usage en local.

---

## Scripts disponibles

Depuis `frontend/` :

| Commande | Rôle |
|----------|------|
| `pnpm dev` | Serveur de développement avec Turbopack (port 3000) |
| `pnpm build` | Build de production optimisé (dossier `.next/`) |
| `pnpm start` | Lance le build de production préalablement généré |
| `pnpm lint` | Analyse statique ESLint |
| `pnpm exec tsc --noEmit` | Vérification TypeScript seule |

---

## Pages & fonctionnalités

### `/` — Organisateur

- **Import de tâches** depuis JSON / CSV / Excel (glisser-déposer) ou ajout manuel.
- **Choix du mode** de planification :
  - `CSP seul` : contraintes pures (échec si aucune solution).
  - `CSP + Règles` : arbitrage automatique des conflits (défaut).
- **Lancer la planification** : affiche le calendrier + le panneau Décisions & Stats.
- **Calendrier interactif** : vues **Jour**, **Semaine** et **Mois**, navigation par dates.
- **Placement manuel** d'une tâche non planifiée (créneau proposé automatiquement) et **inspection du raisonnement** de chaque décision.
- **Sauvegarde / restauration** de l'état côté backend (`/api/sauvegarder`, `/api/etat`).
- Thème clair / sombre persisté localement.

### `/scenarios` — Banc de test

- **6 scénarios** prédéfinis (semaine standard, dépendances en chaîne, conflits de priorités, horaires fixes, surcharge, projet d'équipe).
- Lancement en parallèle des deux modes → **comparatif CSP vs Règles** (cartes côte à côte + tableau de métriques).
- **Vue Calendrier** avec suivi de planification par priorité et **tâches à placer** dans un panneau latéral.
- Modification / ajout de tâches dans un scénario et replanification immédiate.

---

## Structure du projet

```text
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Layout racine (ThemeProvider + Toaster)
│   │   ├── page.tsx                   # Page Organisateur
│   │   └── scenarios/page.tsx         # Banc de test Scénarios
│   ├── components/
│   │   ├── ImportTaches.tsx           # Drag & drop + prévisualisation d'import
│   │   ├── SelecteurVue.tsx           # Toggle Jour/Semaine/Mois + navigation
│   │   ├── CalendrierVue.tsx          # Calendrier (3 vues)
│   │   ├── PanneauDecisions.tsx       # Accordéon décisions / avertissements / échecs
│   │   ├── ModalAjoutTache.tsx        # Ajout de tâche
│   │   ├── ModalPlacementManuel.tsx   # Placement manuel
│   │   ├── ModalRaisonnementTache.tsx # Raisonnement d'une décision
│   │   └── DarkModeToggle.tsx         # Bascule clair/sombre
│   ├── lib/
│   │   ├── api.ts                     # Client HTTP vers l'API FastAPI
│   │   └── planningUtils.ts           # Calcul des créneaux disponibles
│   └── providers/
│       └── ThemeProvider.tsx          # Gestion du thème clair/sombre
├── public/
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Couplage avec le backend

| Côté frontend | Endpoint backend | Utilité |
|---------------|------------------|---------|
| `src/lib/api.ts` (`importerFichier`) | `POST /api/importer` | Import de fichiers |
| `src/lib/api.ts` (`planifier`) | `POST /api/planifier` | Planification |
| `src/lib/api.ts` (`sauvegarderEtat` / `chargerEtat`) | `POST /api/sauvegarder` · `GET /api/etat` | Persistance de l'état |
| Proxy `src/app/api/planifier/route.ts` (optionnel) | `POST /api/planifier` | Proxy serveur si besoin |

---

## Déploiement (production)

```bash
pnpm install
pnpm build
pnpm start
```

Le serveur écoute alors sur **http://localhost:3000**. Adaptez `NEXT_PUBLIC_API_URL` (embarquée côté client au moment du build) et `BACKEND_URL` (proxy) à l'URL de votre API en production — la CORS du backend doit autoriser l'origine du frontend.
