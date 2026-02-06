# Structure du Projet

## Arborescence

```
lol-draft-pro/
├── public/
│   └── data/              # Données statiques (à créer)
│       ├── champions.json
│       └── stats/
├── src/
│   ├── components/
│   │   ├── common/        # Composants réutilisables
│   │   │   └── ProtectedRoute.jsx
│   │   ├── draft/         # Composants de la page Draft
│   │   │   ├── InitModal.jsx
│   │   │   ├── ChampionSelectModal.jsx
│   │   │   └── TeamSide.jsx
│   │   ├── layout/        # Layout global
│   │   │   ├── Header.jsx
│   │   │   └── Layout.jsx
│   │   ├── stats/         # Composants Stats
│   │   │   ├── StatsTable.jsx
│   │   │   ├── SeasonSelector.jsx
│   │   │   └── SearchBar.jsx
│   │   └── team/          # Composants Équipe
│   │       ├── PlayerCard.jsx
│   │       ├── PlayerModal.jsx
│   │       ├── AddChampionModal.jsx
│   │       └── TeamStatsDisplay.jsx
│   ├── contexts/          # Contexts React
│   │   └── AuthContext.jsx
│   ├── hooks/             # Custom hooks
│   │   └── useTeam.js
│   ├── lib/               # Utilitaires
│   │   ├── supabase.js
│   │   ├── draftPhases.js
│   │   └── csvParser.js
│   ├── pages/             # Pages principales
│   │   ├── Home.jsx
│   │   ├── Draft.jsx
│   │   ├── Team.jsx
│   │   ├── Stats.jsx
│   │   └── Login.jsx
│   ├── App.jsx            # Router principal
│   ├── main.jsx           # Point d'entrée
│   └── index.css          # Styles globaux
├── .env                   # Variables d'environnement (gitignored)
├── .gitignore
├── package.json
├── tailwind.config.js     # Config Tailwind
├── postcss.config.js
├── vite.config.js
├── vercel.json            # Config Vercel
├── README.md
├── DEPLOY.md              # Guide de déploiement
├── SUPABASE_SETUP.md      # Setup BDD
├── CHAMPIONS.md           # Guide champions
└── CSV_STATS.md           # Guide CSV
```

## Composants principaux

### Pages

#### `Home.jsx`
- Landing page
- Hero section avec CTA
- Section features
- Animations Framer Motion

#### `Draft.jsx`
- Modal d'initialisation (side + bans)
- Interface de draft Blue/Red
- Modal de sélection de champions
- Logique de phases de draft tournoi
- Gestion des bans/picks

#### `Team.jsx`
- Création d'équipe
- CRUD joueurs (5 max)
- Gestion des pools de champions
- Import/affichage JSON stats

#### `Stats.jsx`
- Tabs (Pros, SoloQ, Joueurs, Tournois, Équipes)
- Import CSV
- Tableaux interactifs avec tri
- Filtres (saison, recherche)

#### `Login.jsx`
- Formulaire connexion/inscription
- Intégration Supabase Auth
- Redirection après login

### Composants Layout

#### `Header.jsx`
- Navigation principale
- Indicateur de page active
- Bouton connexion/déconnexion
- Animations tab active

#### `Layout.jsx`
- Wrapper global
- Gestion du header (caché sur page Draft)
- Outlet pour React Router

### Composants Draft

#### `InitModal.jsx`
- Choix Blue/Red side
- Option skip bans
- Modal de démarrage

#### `ChampionSelectModal.jsx`
- Grille de champions
- Filtres par rôle
- Barre de recherche
- Désactive champions ban/pick

#### `TeamSide.jsx`
- Affichage picks/bans d'une équipe
- Animations sur ajout
- Indicateur équipe active

### Composants Team

#### `PlayerCard.jsx`
- Carte joueur avec rôle
- Pool de champions
- Boutons edit/delete
- Indicateur de maîtrise

#### `PlayerModal.jsx`
- Formulaire add/edit joueur
- Nom, rôle, position

#### `AddChampionModal.jsx`
- Ajout champion au pool
- Recherche champion
- Niveau de maîtrise

#### `TeamStatsDisplay.jsx`
- Affichage stats JSON
- Stats générales
- Derniers matchs
- Stats détaillées

### Composants Stats

#### `StatsTable.jsx`
- Tableau triable
- Format automatique des valeurs
- Animations ligne par ligne

#### `SeasonSelector.jsx`
- Boutons de sélection saison
- S10 à S16 + "Toutes"

#### `SearchBar.jsx`
- Barre de recherche avec icône
- Filtre en temps réel

### Hooks

#### `useTeam.js`
- Gestion complète équipe/joueurs
- CRUD via Supabase
- Loading states
- Refetch automatique

### Contexts

#### `AuthContext.jsx`
- Gestion authentification
- Session utilisateur
- SignIn/SignUp/SignOut
- Auto-refresh session

### Lib/Utils

#### `supabase.js`
- Client Supabase configuré
- Variables d'environnement

#### `draftPhases.js`
- Ordre des phases de draft tournoi
- Labels et positions
- Export ROLES

#### `csvParser.js`
- Parse CSV → JSON
- Conversion types
- Filtres et tri
- Flexible (détection colonnes)

## Flow de l'application

### 1. Démarrage
```
main.jsx → App.jsx → AuthProvider → BrowserRouter
```

### 2. Navigation
```
Layout.jsx (Header + Outlet) → Pages spécifiques
```

### 3. Authentification
```
Login.jsx → Supabase Auth → AuthContext → ProtectedRoute
```

### 4. Draft Flow
```
Draft.jsx (InitModal) → Config → Phases loop → ChampionSelectModal → Update state
```

### 5. Team Flow
```
Team.jsx → useTeam hook → Supabase CRUD → PlayerCard/Modals
```

### 6. Stats Flow
```
Stats.jsx → Import CSV → csvParser → StatsTable
```

## État global

### AuthContext
```javascript
{
  user: User | null,
  loading: boolean,
  signIn: (email, password) => Promise,
  signUp: (email, password) => Promise,
  signOut: () => Promise
}
```

### Draft State
```javascript
{
  config: { side, skipBans },
  currentPhaseIndex: number,
  bluePicks: Champion[],
  redPicks: Champion[],
  blueBans: Champion[],
  redBans: Champion[]
}
```

### Team State (via useTeam)
```javascript
{
  team: Team | null,
  players: Player[],
  loading: boolean,
  // + CRUD methods
}
```

## Styles

### Couleurs principales
- `dark-bg`: #0a0a0a
- `dark-card`: #1a1a1a
- `dark-border`: #2a2a2a
- `accent-blue`: #3b82f6
- `accent-gold`: #fbbf24

### Classes utilitaires custom
- `.glow-blue`: Box shadow bleu
- `.glow-gold`: Box shadow or

## Routes

```
/ → Home
/draft → Draft (Protected)
/team → Team (Protected)
/stats → Stats
/login → Login
```

## Optimisations

- ✅ Lazy loading (React Router)
- ✅ Protected routes
- ✅ Memo/useMemo où nécessaire
- ✅ Framer Motion (animations performantes)
- ✅ Tailwind (CSS optimisé)
- ✅ RLS Supabase (sécurité)

## Prochaines améliorations possibles

1. **Draft**
   - Timer par phase
   - Suggestions intelligentes
   - Historique de drafts
   - Export draft en image

2. **Team**
   - Avatars joueurs (Supabase Storage)
   - Statistiques par joueur
   - Comparaison entre joueurs

3. **Stats**
   - Graphiques (Chart.js/Recharts)
   - Export PDF/CSV
   - Tendances par patch
   - Prédictions IA

4. **Général**
   - Mode sombre/clair
   - Multilingue (i18n)
   - PWA (offline)
   - WebSocket pour draft en équipe
