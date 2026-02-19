# 📍 Localisation du Code - Top 5 Champions + Rank

## 🎯 Fonctionnalité
Récupération et affichage des **5 champions les plus joués en Solo Q** et du **rang** du joueur depuis OP.gg/Porofessor.

---

## 📂 Fichiers Concernés

### 1. **Récupération des Données (Scraping)**

#### `src/lib/opggScraper.js` (1000+ lignes)
**Rôle**: Scraping OP.gg et Porofessor pour extraire rank et top champions

**Fonctions principales:**
- `fetchOpggData(opggUrl)` - Fonction principale qui récupère les données
  - Essaie d'abord Porofessor (`fetchPorofessorData`)
  - Fallback sur OP.gg (`parseOpggHtml`)
- `parseOpggUrl(url)` - Parse l'URL OP.gg pour extraire région et pseudo
- `fetchPorofessorData(porofessorUrl)` - Scrape Porofessor
- `parsePorofessorHtml(html)` - Parse le HTML Porofessor
- `parseOpggHtml(html, parsed)` - Parse le HTML OP.gg
- `formatChampionName(slug)` - Formate les noms de champions

**Retourne:**
```javascript
{
  rank: "master 344 LP",
  topChampions: [
    { name: "Jayce", winrate: 75 },
    { name: "Dr. Mundo", winrate: 75 },
    ...
  ],
  region: "euw",
  summonerName: "Marcel Le Zgeg#BACK"
}
```

---

### 2. **Synchronisation (Hook)**

#### `src/pages/team/hooks/usePlayerSync.js` (75 lignes)
**Rôle**: Hook pour synchroniser les données OP.gg

**Fonctions:**
- `syncPlayerData(playerData)` - Synchronise automatiquement lors de la création/modification
  - Vérifie si `opgg_link` existe
  - Vérifie si `rank` ou `top_champions` manquent
  - Appelle `fetchOpggData` si nécessaire
  - Fusionne les données récupérées avec les données du joueur

- `syncExistingPlayer(player)` - Synchronise un joueur existant
  - Appelle `fetchOpggData`
  - Retourne seulement les données à mettre à jour

**Utilisé dans:**
- `TeamOverviewPage.jsx` - Lors de la sauvegarde d'un joueur

---

### 3. **Affichage (Composant)**

#### `src/components/team/PlayerCard.jsx` (273 lignes)
**Rôle**: Affiche les données du joueur (rank + top 5 champions)

**Sections concernées:**
- **Lignes 25-82**: `getRankColor(rank)` - Détermine la couleur de fond selon le rang
- **Lignes 88-89**: Utilise `getRankColor` pour la couleur de la card
- **Lignes 151-155**: Affiche le rang dans le header
- **Lignes 208-268**: Affiche les Top 5 Champions
  - Parse `top_champions` (string JSON ou array)
  - Filtre les champions invalides
  - Affiche l'image + winrate

**Props utilisées:**
- `player.rank` - Rang du joueur
- `player.top_champions` - Array des top champions

---

### 4. **Saisie/Modification (Modal)**

#### `src/components/team/PlayerModal.jsx` (343 lignes)
**Rôle**: Formulaire pour créer/modifier un joueur

**Sections concernées:**
- **Lignes 13**: `rank` state
- **Lignes 37-47**: `getTopChampions()` - Parse les top champions
- **Lignes 49**: `topChampions` state
- **Lignes 69-95**: `handleSyncOpgg()` - Bouton de synchronisation manuelle
  - Appelle `fetchOpggData`
  - Met à jour `rank` et `topChampions`
- **Lignes 116-117**: Envoie `rank` et `top_champions` lors de la sauvegarde
- **Lignes 272-283**: Champ input pour le rang (manuel)
- **Lignes 284-310**: Liste des top champions (édition manuelle)

---

### 5. **Orchestration (Page)**

#### `src/pages/team/overview/TeamOverviewPage.jsx` (155 lignes)
**Rôle**: Page principale qui orchestre tout

**Sections concernées:**
- **Lignes 26**: Import de `usePlayerSync`
- **Lignes 36-53**: `handleSavePlayer()` - Sauvegarde avec synchronisation auto
  - Appelle `syncPlayerData()` avant la sauvegarde
- **Lignes 65-73**: `handleSyncPlayer()` - Synchronisation manuelle d'un joueur existant
  - Appelle `syncExistingPlayer()`
  - Met à jour le joueur

---

### 6. **Sauvegarde en Base (Hook)**

#### `src/hooks/useTeam.js` (171 lignes)
**Rôle**: Gestion CRUD de l'équipe et des joueurs

**Sections concernées:**
- **Lignes 77-90**: `createPlayer()` - Sauvegarde avec formatage JSONB
  - Formate `top_champions` pour Supabase (JSONB)
- **Lignes 103-110**: `updatePlayer()` - Mise à jour avec formatage JSONB
  - Formate `top_champions` pour Supabase (JSONB)

---

## 🔄 Flux de Données

```
1. Utilisateur entre pseudo + région
   ↓
2. PlayerModal génère opgg_link automatiquement
   ↓
3. Utilisateur sauvegarde OU clique sur "Sync"
   ↓
4. usePlayerSync.syncPlayerData() appelé
   ↓
5. fetchOpggData() dans opggScraper.js
   ↓
6. Essaie Porofessor → Fallback OP.gg
   ↓
7. Parse HTML pour extraire rank + topChampions
   ↓
8. Retourne { rank, topChampions }
   ↓
9. useTeam.createPlayer() / updatePlayer()
   ↓
10. Sauvegarde dans Supabase (JSONB)
   ↓
11. PlayerCard affiche les données
```

---

## 🎨 Affichage Visuel

### Dans PlayerCard:
- **Header**: Couleur de fond selon le rang (fonction `getRankColor`)
- **Badge Rang**: Affiché dans le header si disponible
- **Section "Top 5 Champions"**: 
  - Grid 5 colonnes
  - Image du champion
  - Winrate en dessous

---

## 📝 Format des Données

### En Base de Données (Supabase):
```sql
rank: TEXT
top_champions: JSONB
```

### Format JSONB:
```json
[
  { "name": "Jayce", "winrate": 75 },
  { "name": "Dr. Mundo", "winrate": 75 },
  { "name": "Sylas", "winrate": 67 }
]
```

---

## 🔧 Points d'Amélioration Potentiels

1. **opggScraper.js** - Très long (1000+ lignes), pourrait être découpé
2. **Parsing HTML** - Fragile, dépend de la structure HTML des sites
3. **Gestion d'erreurs** - Pourrait être améliorée
4. **Cache** - Pas de cache pour éviter les appels répétés

---

## 📍 Résumé des Fichiers

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/lib/opggScraper.js` | ~1000 | Scraping OP.gg/Porofessor |
| `src/pages/team/hooks/usePlayerSync.js` | 75 | Hook synchronisation |
| `src/components/team/PlayerCard.jsx` | 273 | Affichage rank + champions |
| `src/components/team/PlayerModal.jsx` | 343 | Formulaire + sync manuel |
| `src/pages/team/overview/TeamOverviewPage.jsx` | 155 | Orchestration |
| `src/hooks/useTeam.js` | 171 | CRUD base de données |

**Total: ~2000 lignes de code pour cette fonctionnalité**
