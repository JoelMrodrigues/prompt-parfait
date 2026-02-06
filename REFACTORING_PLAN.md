# Plan de Refactorisation - LoL Draft Pro

## 📋 Analyse du Projet Actuel

### Structure des Pages

#### 1. **Home** (`/`)
- **Fonctionnalité**: Page d'accueil avec présentation
- **Composants**: Hero section, Features, CTA
- **État**: ✅ Simple et propre

#### 2. **Draft** (`/draft`)
- **Fonctionnalité**: Simulateur de draft
- **Sous-fonctionnalités**:
  - Configuration initiale (InitModal)
  - Sélection de champions (ChampionSelectModal)
  - Gestion des phases (bans/picks)
  - Affichage des équipes (TeamSide)
- **État**: ⚠️ Logique métier mélangée avec UI

#### 3. **Team** (`/team`)
- **Fonctionnalité**: Gestion d'équipe
- **Sous-fonctionnalités**:
  - Création/modification d'équipe
  - Gestion des joueurs (CRUD)
  - Synchronisation OP.gg/Porofessor
  - Pool de champions par joueur
  - Statistiques d'équipe
- **État**: ⚠️ Trop de logique dans le composant

#### 4. **Stats** (`/stats`)
- **Fonctionnalité**: Hub de navigation vers les stats
- **Sous-fonctionnalités**:
  - Sélection de saison
  - Navigation Pro/SoloQ
  - Mise à jour S16
- **État**: ✅ OK mais peut être amélioré

#### 5. **ProChampions** (`/stats/pro/champions`)
- **Fonctionnalité**: Liste des champions avec stats
- **Sous-fonctionnalités**:
  - Filtres (saison, split, league, rôle, patch)
  - Tableau de stats
  - Tri et recherche
- **État**: ⚠️ Logique de filtrage complexe

#### 6. **ChampionDetail** (`/stats/champion/:championName`)
- **Fonctionnalité**: Détails d'un champion
- **Sous-fonctionnalités**:
  - Stats globales
  - Liste des matchs
  - Filtres
- **État**: ⚠️ Beaucoup de logique

#### 7. **MatchDetail** (`/stats/match/:gameid`)
- **Fonctionnalité**: Détails d'un match
- **Sous-fonctionnalités**:
  - Composition des équipes
  - Stats par joueur
  - Timeline
- **État**: ⚠️ À vérifier

#### 8. **ProTeams** (`/stats/pro/teams`)
- **Fonctionnalité**: Liste des équipes
- **État**: ⚠️ À vérifier

#### 9. **ProPlayers** (`/stats/pro/players`)
- **Fonctionnalité**: Liste des joueurs
- **État**: ⚠️ À vérifier

#### 10. **ProTournaments** (`/stats/pro/tournaments`)
- **Fonctionnalité**: Liste des tournois
- **État**: ⚠️ À vérifier

#### 11. **Login** (`/login`)
- **Fonctionnalité**: Authentification
- **État**: ✅ Simple

---

## 🎯 Plan de Refactorisation

### Principe: Séparation des Responsabilités

Chaque page doit être découpée en:
1. **Page principale** (orchestration)
2. **Hooks personnalisés** (logique métier)
3. **Composants UI** (présentation)
4. **Services/Utils** (appels API, transformations)

### Structure Cible

```
src/
├── pages/
│   ├── home/
│   │   └── HomePage.jsx
│   ├── draft/
│   │   ├── DraftPage.jsx
│   │   ├── hooks/
│   │   │   ├── useDraft.js
│   │   │   └── useDraftPhases.js
│   │   └── components/
│   │       ├── DraftBoard/
│   │       ├── ChampionSelector/
│   │       └── TeamDisplay/
│   ├── team/
│   │   ├── TeamPage.jsx
│   │   ├── hooks/
│   │   │   ├── useTeam.js (existant)
│   │   │   └── usePlayerSync.js
│   │   └── components/
│   │       ├── TeamHeader/
│   │       ├── PlayerList/
│   │       ├── PlayerCard/ (existant)
│   │       └── TeamStats/
│   └── stats/
│       ├── StatsHubPage.jsx
│       ├── champions/
│       │   ├── ChampionsListPage.jsx
│       │   ├── ChampionDetailPage.jsx
│       │   ├── hooks/
│       │   │   ├── useChampionStats.js
│       │   │   └── useChampionFilters.js
│       │   └── components/
│       │       ├── ChampionTable/
│       │       ├── ChampionFilters/
│       │       └── ChampionDetailView/
│       ├── matches/
│       │   ├── MatchDetailPage.jsx
│       │   └── components/
│       │       └── MatchView/
│       ├── teams/
│       │   └── TeamsListPage.jsx
│       ├── players/
│       │   └── PlayersListPage.jsx
│       └── tournaments/
│           └── TournamentsListPage.jsx
├── components/
│   ├── common/ (existant)
│   ├── layout/ (existant)
│   └── shared/ (composants réutilisables)
├── hooks/
│   └── shared/ (hooks réutilisables)
└── lib/
    ├── api/ (appels API)
    ├── services/ (logique métier)
    └── utils/ (helpers)
```

---

## 📝 Étapes de Refactorisation

### Phase 1: Structure de Base
1. ✅ Créer la nouvelle structure de dossiers
2. ✅ Déplacer les fichiers existants
3. ✅ Mettre à jour les imports

### Phase 2: Refactorisation par Page

#### 2.1 Draft Page
- [ ] Extraire la logique dans `useDraft.js`
- [ ] Créer `useDraftPhases.js` pour la gestion des phases
- [ ] Découper en composants: `DraftBoard`, `ChampionSelector`, `TeamDisplay`
- [ ] Nettoyer `DraftPage.jsx` (orchestration uniquement)

#### 2.2 Team Page
- [ ] Améliorer `useTeam.js` (séparer les responsabilités)
- [ ] Créer `usePlayerSync.js` pour la synchro OP.gg
- [ ] Découper en composants: `TeamHeader`, `PlayerList`, `PlayerCard`, `TeamStats`
- [ ] Nettoyer `TeamPage.jsx`

#### 2.3 Stats Pages
- [ ] Créer `useChampionStats.js` pour la logique de stats
- [ ] Créer `useChampionFilters.js` pour les filtres
- [ ] Découper `ChampionDetail` en sous-composants
- [ ] Nettoyer toutes les pages stats

### Phase 3: Services et Utils
- [ ] Créer `lib/api/statsApi.js` pour les appels stats
- [ ] Créer `lib/api/teamApi.js` pour les appels équipe
- [ ] Créer `lib/services/championService.js` pour la logique métier
- [ ] Créer `lib/utils/formatters.js` pour les formats

### Phase 4: Tests et Validation
- [ ] Vérifier que tout fonctionne
- [ ] Nettoyer les imports inutilisés
- [ ] Optimiser les performances

---

## 🔧 Règles de Refactorisation

1. **Une responsabilité par fichier**
2. **Hooks pour la logique métier**
3. **Composants pour l'UI**
4. **Services pour les appels API**
5. **Utils pour les helpers**
6. **Nommage clair et cohérent**
7. **Pas de duplication de code**

---

## 📊 Priorités

1. **URGENT**: Draft et Team (les plus complexes)
2. **IMPORTANT**: Stats pages (beaucoup de logique)
3. **NORMAL**: Autres pages (plus simples)
