# CLAUDE.md — LoL Draft Pro

Instructions permanentes pour Claude Code sur ce projet.

## Stack

- **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS (dark/light via CSS vars)
- **Backend** : Express (server/) — déployé sur Railway / Render
- **DB** : Supabase PostgreSQL avec RLS
- **Deploy** : Vercel (frontend) + Railway (backend)

## Commandes

```bash
npm run dev          # frontend + backend en parallèle
npm run dev:client   # vite uniquement
npm run dev:server   # backend Express avec tsx --watch
npm run build        # build prod Vite
npm run check        # Biome lint + format (à lancer avant commit)
npm run import-dragon-runes  # peuple lol_runes depuis Data Dragon
```

## Architecture

### Contextes
- `TeamContext` (`src/contexts/TeamContext.tsx`) — singleton, **un seul fetch Supabase** partagé. Ne pas créer de hooks qui fetch indépendamment.
- `AuthContext` — user + profile (active_team_id, display_name)
- `ToastContext` — notifications globales

### Hooks auto-sync (background, invisibles)
- `useSoloqMoodSync` — met à jour soloq_mood_last_5 de chaque joueur
- `useTeamMoodSync` — idem pour team_mood_last_5
- `useTeamAutoSync` — déclenche les syncs au mount de TeamLayout

### Services Supabase (`src/services/supabase/`)
- `teamQueries.ts` — createTeam, updateTeam, deleteTeam, getOrCreateInviteToken, joinTeamByToken
- `playerQueries.ts` — fetchPlayersByTeam, createPlayer, updatePlayer, deletePlayer
- `profileQueries.ts` — fetchProfile, upsertProfile, fetchAllTeams (own + joined via team_members)
- `championQueries.ts` — addChampionToPool, removeChampionFromPool
- `runeQueries.ts` — fetchAllRunes, fetchRunesByIds

## Patterns obligatoires

### Modals — toujours createPortal
```tsx
import { createPortal } from 'react-dom'
// ...
const modal = (
  <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <motion.div className="bg-dark-card ... flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
      <div className="shrink-0 ...">/* header */</div>
      <form className="overflow-y-auto flex-1 min-h-0 ...">/* content scrollable */</form>
    </motion.div>
  </div>
)
return createPortal(modal, document.body)
```
**Raison** : Framer Motion applique `transform` sur les parents → `position: fixed` devient relatif au parent au lieu du viewport.

### Constantes partagées → `src/lib/constants.ts`
- `SEASON_16_START_MS = 1767830400000` (2026-01-08)
- `REMAKE_THRESHOLD_SEC = 180`
- `PAGE_SIZE = 20`
- `getBackendUrl()` — URL backend selon env

### Thème adaptatif
- `text-white` = `--color-foreground` (noir en light, blanc en dark) — s'adapte automatiquement
- `!text-white` = forcé avec `!important` — utiliser sur fonds colorés (gradients rank, boutons)
- `text-off-white` = toujours blanc `#ffffff` — pour texte sur boutons accent/colorés

### CSS classes principales
- `bg-dark-bg` / `bg-dark-card` / `border-dark-border` — backgrounds adaptatifs
- `text-accent-blue` / `bg-accent-blue` — couleur principale (mappée sur `--color-accent`)
- `text-gray-300/400/500/600` — textes secondaires adaptatifs

## Structure fichiers clés

```
src/
├── contexts/
│   ├── TeamContext.tsx          ← état global équipe + joueurs
│   ├── AuthContext.tsx          ← user + profile
│   └── ToastContext.tsx
├── lib/
│   ├── constants.ts             ← SEASON_16_START_MS, PAGE_SIZE, getBackendUrl
│   ├── supabase.ts
│   └── championImages.ts
├── pages/
│   ├── teams/TeamsPage.tsx      ← liste + création équipes (avec sélecteur type)
│   └── team/
│       ├── TeamLayout.tsx       ← layout + hooks auto-sync
│       ├── TeamSidebar.tsx      ← nav + switcher équipes
│       ├── overview/TeamOverviewPage.tsx
│       ├── joueurs/
│       │   ├── JoueursPage.tsx
│       │   ├── PlayerDetailPage.tsx   ← orchestrateur pur → usePlayerDetail
│       │   ├── hooks/usePlayerDetail.ts
│       │   └── utils/playerDetailHelpers.ts
│       ├── drafts/DraftsPage.tsx      ← NE PAS TOUCHER (très stable)
│       ├── champion-pool/ChampionPoolPage.tsx
│       ├── import/ImportPage.tsx
│       ├── coaching/CoachingPage.tsx
│       └── components/
│           ├── PlayerModal.tsx         ← createPortal ✓
│           ├── TeamEditModal.tsx       ← createPortal ✓
│           └── PlayerCard.tsx
├── services/supabase/
└── server/                      ← backend Express (Railway)
    └── routes/riot.routes.ts    ← endpoints Riot API (VITE_RIOT_API_KEY côté server UNIQUEMENT)
```

## Base de données (tables principales)

```
teams           — id, user_id, team_name, team_type, logo_url, accent_color, invite_token
players         — id, team_id, player_name, pseudo, position, rank, player_type, puuid
team_members    — team_id, user_id, role  ← équipes rejointes via invitation
player_soloq_matches — id, player_id, account_source, win, kills, deaths, assists,
                        cs, total_damage, vision_score, gold_earned, items, runes, match_json
lol_runes       — peuplé via import-dragon-runes
```

## Sécurité
- Clé Riot API → `server/.env` uniquement, jamais dans `.env` frontend
- Toutes les requêtes Riot → backend Express, jamais côté client
- RLS Supabase : `user_has_team_access(team_id)` — fonction SQL SECURITY DEFINER

## Ce qu'il ne faut PAS toucher
- `DraftsPage.tsx` — feature la plus stable, auto-save debounced 800ms
- `exaltyMatchImporter/Parser/TimelineParser` — parsing robuste
- `ChampionPoolPage` — drag-drop + tiers fonctionnent parfaitement
- Backend cache LRU 15min + retry 429 — production-ready

## Migrations SQL (supabase/supabase-migrations-sprint2.sql)
Déjà appliquées. Colonnes ajoutées : `player_type`, `puuid`, `accent_color`, `team_type`, colonnes SoloQ enrichies.
