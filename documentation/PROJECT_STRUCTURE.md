# Structure du Projet - LoL Draft Pro

## 📁 Structure Globale

```
src/
├── pages/
│   ├── home/
│   │   └── HomePage.jsx
│   ├── stats/
│   │   ├── StatsHubPage.jsx
│   │   ├── champions/
│   │   ├── players/
│   │   ├── teams/
│   │   ├── matches/
│   │   └── tournaments/
│   ├── team/
│   │   ├── TeamLayout.jsx (avec Sidebar + Header)
│   │   ├── overview/ (accueil équipe)
│   │   ├── champion-pool/
│   │   ├── stats/
│   │   ├── drafts/
│   │   └── coaching/
│   └── draft/
│       └── DraftPage.jsx (à laisser de côté pour le moment)
├── components/
│   ├── common/
│   ├── layout/
│   └── shared/
├── hooks/
│   └── shared/
└── lib/
    ├── api/
    ├── services/
    └── utils/
```

---

## 1. 📄 Home Page

### Fonctionnalités
- Page vitrine avec navigation
- Boutons vers les différentes sections
- Style visuel attractif

### Structure
```
src/pages/home/
└── HomePage.jsx
```

**Composants utilisés:**
- Navigation buttons (vers /stats, /team, /draft)
- Hero section avec animations
- Features cards

**Pas de hooks nécessaires** - Page purement présentationnelle

---

## 2. 📊 Stats Pages

### Fonctionnalités Globales
- Hub de navigation vers sous-pages
- Sélection de saison
- Mise à jour S16

### Sous-Pages

#### 2.1 Champions (très pointu)
- Liste des champions avec stats
- Détails d'un champion (page dédiée)
- Filtres avancés (saison, split, league, rôle, patch)
- Tableau de stats avec tri
- Recherche

#### 2.2 Players
- Liste des joueurs
- Stats par joueur
- Filtres

#### 2.3 Teams
- Liste des équipes
- Stats par équipe
- Filtres

#### 2.4 Matches
- Liste des matchs
- Détails d'un match (page dédiée)
- Filtres

#### 2.5 Tournaments
- Liste des tournois
- Stats par tournoi
- Filtres

### Structure
```
src/pages/stats/
├── StatsHubPage.jsx
├── champions/
│   ├── ChampionsListPage.jsx
│   ├── ChampionDetailPage.jsx
│   ├── hooks/
│   │   ├── useChampionStats.js
│   │   ├── useChampionFilters.js
│   │   └── useChampionSearch.js
│   └── components/
│       ├── ChampionTable/
│       │   ├── ChampionTable.jsx
│       │   └── ChampionRow.jsx
│       ├── ChampionFilters/
│       │   └── ChampionFilters.jsx
│       ├── ChampionDetailView/
│       │   ├── ChampionStatsSection.jsx
│       │   ├── ChampionMatchesSection.jsx
│       │   └── ChampionBuildsSection.jsx
│       └── SeasonSelector/
│           └── SeasonSelector.jsx
├── players/
│   ├── PlayersListPage.jsx
│   ├── PlayerDetailPage.jsx
│   ├── hooks/
│   │   └── usePlayerStats.js
│   └── components/
│       └── PlayerTable/
├── teams/
│   ├── TeamsListPage.jsx
│   ├── TeamDetailPage.jsx
│   ├── hooks/
│   │   └── useTeamStats.js
│   └── components/
│       └── TeamTable/
├── matches/
│   ├── MatchesListPage.jsx
│   ├── MatchDetailPage.jsx
│   ├── hooks/
│   │   └── useMatchStats.js
│   └── components/
│       └── MatchView/
│           ├── MatchHeader.jsx
│           ├── TeamComposition.jsx
│           └── PlayerStats.jsx
└── tournaments/
    ├── TournamentsListPage.jsx
    ├── TournamentDetailPage.jsx
    ├── hooks/
    │   └── useTournamentStats.js
    └── components/
        └── TournamentTable/
```

---

## 3. 👥 Team Pages

### Layout Global
- **Sidebar** : Navigation entre les sections
- **Header** : Infos équipe + actions rapides
- **Content** : Zone principale avec sous-pages

### Sections

#### 3.1 Overview (Accueil équipe) - ACTUEL
- Création/modification équipe
- Liste des joueurs
- Ajout/modification/suppression joueurs
- Synchronisation OP.gg/Porofessor
- Affichage des joueurs par rôle

#### 3.2 Champion Pool
- Gestion des champions par joueur
- Champions joués
- Niveau de maîtrise
- Stats par champion/joueur

#### 3.3 Stats
- Games de l'équipe
- Stats individuelles (par joueur)
- Stats d'équipe (globales)
- Graphiques et visualisations

#### 3.4 Drafts
- Liste des schémas de draft
- Création/édition de draft
- Organisation en dossiers
- Visualisation des drafts

#### 3.5 Coaching
- Bloc notes principal
- Sidebar avec liste des joueurs
- Notes individuelles par joueur
- Notes équipe (all)
- Stats contextuelles (joueurs + équipe)

### Structure
```
src/pages/team/
├── TeamLayout.jsx (Layout avec Sidebar + Header)
├── TeamSidebar.jsx
├── TeamHeader.jsx
├── overview/
│   ├── TeamOverviewPage.jsx
│   ├── hooks/
│   │   ├── useTeam.js (existant, améliorer)
│   │   └── usePlayerSync.js (nouveau)
│   └── components/
│       ├── TeamForm/
│       │   └── TeamForm.jsx
│       ├── PlayerList/
│       │   ├── PlayerList.jsx
│       │   └── PlayerCard.jsx (existant)
│       ├── PlayerModal/
│       │   └── PlayerModal.jsx (existant)
│       └── TeamStatsDisplay/
│           └── TeamStatsDisplay.jsx (existant)
├── champion-pool/
│   ├── ChampionPoolPage.jsx
│   ├── hooks/
│   │   ├── useChampionPool.js
│   │   └── useChampionMastery.js
│   └── components/
│       ├── PlayerChampionPool/
│       │   └── PlayerChampionPool.jsx
│       ├── ChampionSelector/
│       │   └── ChampionSelector.jsx
│       └── MasteryLevel/
│           └── MasteryLevel.jsx
├── stats/
│   ├── TeamStatsPage.jsx
│   ├── hooks/
│   │   ├── useTeamGames.js
│   │   ├── usePlayerStats.js
│   │   └── useTeamStats.js
│   └── components/
│       ├── GamesList/
│       │   └── GamesList.jsx
│       ├── PlayerStatsCard/
│       │   └── PlayerStatsCard.jsx
│       ├── TeamStatsCard/
│       │   └── TeamStatsCard.jsx
│       └── StatsCharts/
│           ├── WinRateChart.jsx
│           └── PerformanceChart.jsx
├── drafts/
│   ├── DraftsPage.jsx
│   ├── hooks/
│   │   ├── useDraftSchemas.js
│   │   └── useDraftFolders.js
│   └── components/
│       ├── DraftList/
│       │   └── DraftList.jsx
│       ├── DraftEditor/
│       │   └── DraftEditor.jsx
│       ├── DraftViewer/
│       │   └── DraftViewer.jsx
│       └── FolderManager/
│           └── FolderManager.jsx
└── coaching/
    ├── CoachingPage.jsx
    ├── hooks/
    │   ├── useNotes.js
    │   └── usePlayerNotes.js
    └── components/
        ├── NotesEditor/
        │   └── NotesEditor.jsx
        ├── PlayersSidebar/
        │   └── PlayersSidebar.jsx
        ├── PlayerNoteCard/
        │   └── PlayerNoteCard.jsx
        └── TeamNoteCard/
            └── TeamNoteCard.jsx
```

---

## 4. 🎮 Draft Page

### Fonctionnalités
- Simulateur de draft (actuel)
- À laisser de côté pour le moment

### Structure (déjà refactorisée)
```
src/pages/draft/
├── DraftPage.jsx
├── hooks/
│   ├── useDraft.js
│   └── useChampions.js
└── components/ (existant)
```

---

## 📦 Services et Utils Partagés

### API Services
```
src/lib/api/
├── statsApi.js (appels stats)
├── teamApi.js (appels équipe)
└── playerApi.js (appels joueurs)
```

### Business Services
```
src/lib/services/
├── championService.js (logique métier champions)
├── teamService.js (logique métier équipe)
├── draftService.js (logique métier draft)
└── statsService.js (calculs stats)
```

### Utils
```
src/lib/utils/
├── formatters.js (formatage données)
├── validators.js (validation)
└── constants.js (constantes)
```

---

## 🎯 Composants Partagés

```
src/components/shared/
├── Button/
├── Modal/
├── Table/
├── Card/
└── Input/
```

---

## 📝 Routes

```javascript
/stats → StatsHubPage
/stats/pro/champions → ChampionsListPage
/stats/champion/:name → ChampionDetailPage
/stats/pro/players → PlayersListPage
/stats/pro/teams → TeamsListPage
/stats/match/:id → MatchDetailPage
/stats/pro/tournaments → TournamentsListPage

/team → TeamLayout (Overview par défaut)
/team/overview → TeamOverviewPage
/team/champion-pool → ChampionPoolPage
/team/stats → TeamStatsPage
/team/drafts → DraftsPage
/team/coaching → CoachingPage

/draft → DraftPage
```

---

## ✅ Prochaines Étapes

1. **Créer la structure Team** avec Sidebar + Header
2. **Refactoriser Overview** (actuel)
3. **Créer les autres sections Team** une par une
4. **Refactoriser Stats** avec la nouvelle structure
5. **Créer services API** partagés
