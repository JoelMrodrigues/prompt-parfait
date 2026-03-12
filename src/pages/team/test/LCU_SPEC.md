# Spec — LCU Direct Import

> Fichier de travail — ne pas supprimer.
> Toutes les décisions d'archi sont ici avant qu'une seule ligne de code soit écrite.

---

## 🎯 But

Remplacer le workflow actuel (LCU Explorer → sauvegarder manuellement chaque fichier → uploader dans Import)
par un flux en **1 clic** : connexion directe au client LoL → fetch des games → upload Supabase.

---

## 📋 Workflow cible (côté utilisateur)

1. Lancer League of Legends + se connecter
2. Fournir le **lockfile** (ou son contenu) à l'app
3. L'app détecte automatiquement les games disponibles via LCU API
4. Sélection des games à importer (scrims / tournois)
5. Upload direct vers Supabase (match JSON + timeline)
6. Visuel "4 dossiers" : Scrims / Tournois / Timeline / Timeline_TR → voir tout ce qui est en base + télécharger en local si besoin

---

## 🔑 Le lockfile

Le lockfile est un fichier généré par le client LoL à chaque lancement.
Format : `LeagueClient:PID:PORT:PASSWORD:PROTOCOL`
Exemple : `LeagueClient:12345:51234:abc123xyz:https`

Chemin standard :
- Windows : `C:\Riot Games\League of Legends\lockfile`
- Mac : `/Applications/League of Legends.app/Contents/LoL/lockfile`

Les credentials du lockfile donnent accès à l'API LCU locale.
Auth : Basic `riot:{password}` encodé en Base64.
URL base : `https://127.0.0.1:{PORT}`

**⚠️ Le lockfile change à chaque lancement de LoL.**
**⚠️ Valable uniquement pendant que le client est ouvert.**

---

## ✅ Décisions confirmées

### Architecture : Option A — Proxy via backend local
```
Browser → localhost:3001/api/lcu/* → LCU (localhost:{port})
```
- Routes LCU ajoutées à notre Express existant (`server/routes/lcu.routes.ts`)
- Fonctionne quand `npm run dev` est lancé (déjà le cas en dev)
- Frontend envoie port+password avec chaque requête (stateless)

### Lockfile
- L'utilisateur colle le **contenu brut** dans un champ texte
- App parse : `LeagueClient:PID:PORT:PASSWORD:https`
- Extrait port + password → envoyés au backend à chaque appel

### Déploiement futur (mémo)
- Option A ne fonctionne PAS depuis Vercel (backend Railway ≠ localhost user)
- Pour distribuer à d'autres équipes sans contrainte : **app Electron/Tauri** (future V2)
- Ou : chaque user clone le repo + `npm run dev` (Scénario 1, acceptable en interne)

---

## 🚧 Contraintes techniques — CONFIRMÉES après analyse GitHub

### 🔴 Bloquant n°1 : CORS désactivé sur l'API LCU
L'API LCU **n'a pas de header CORS**. Un browser (même sur localhost) ne peut PAS
appeler directement `https://127.0.0.1:{port}` — la requête sera bloquée par le browser.
LCU Explorer contourne ça car c'est une **app Electron** (pas un browser).

### 🔴 Bloquant n°2 : Certificat auto-signé
LCU tourne en HTTPS avec un cert auto-signé. Node.js peut l'ignorer avec
`rejectUnauthorized: false`. Le browser, non (sauf manipulation manuelle).

### 🟡 Pas bloquant : Auth
Username toujours `riot`, password = champ 4 du lockfile.
Header : `Authorization: Basic base64("riot:password")`

### 🟡 Pas bloquant : Endpoints utiles confirmés
```
GET /lol-summoner/v1/current-summoner          → infos du joueur connecté
GET /lol-match-history/v1/products/lol/{puuid}/matches  → historique custom games
GET /lol-end-of-game/v1/eog-stats-block        → stats fin de partie (en live)
GET /lol-gameflow/v1/gameflow-metadata         → état de la partie en cours
```

### 🟠 Important : Timelines
Les timelines détaillées (timeline_json) **ne sont PAS dans l'API LCU**.
Elles viennent de l'**API Riot publique** (`/lol/match/v5/matches/{id}/timeline`).
→ On a déjà ça via notre backend Railway ✓

---

## 🏗️ Options d'architecture — À CHOISIR

### Option A — Script local Node.js (recommandé ⭐)
```
npm run lcu-proxy   (tourne en arrière-plan sur localhost:3002)
    ↓ lit lockfile auto depuis C:\Riot Games\...\lockfile
    ↓ se connecte LCU (rejectUnauthorized: false)
    ↓ expose HTTP sans CORS
Browser → localhost:3002 → LCU → Supabase
```
✅ Transparent pour l'user (une commande à lancer)
✅ Zéro manipulation SSL
✅ Upload Supabase depuis le proxy (pas le browser)
❌ User doit avoir Node.js installé (déjà le cas ici)

### Option B — Script CLI one-shot
```
npm run lcu-import
→ lit lockfile → fetch games LCU → upload Supabase → résumé terminal
```
✅ Le plus simple à coder
✅ Zéro UI à faire
❌ Résultat terminal seulement, pas de feedback dans l'app

### Option C — User accepte le cert manuellement dans Chrome
```
User va sur https://127.0.0.1:{port} dans Chrome → accepte le cert
Puis le browser peut appeler le LCU directement
```
✅ Zero install, zero script
❌ Mauvaise UX, à refaire à chaque redémarrage LoL
❌ CORS toujours bloquant même après cert accepté

---

## 📁 Structure visuelle "4 dossiers"

Interface dans la TestPage → future ImportPage :
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Scrims    │  │  Tournois   │  │  Timelines  │  │Timeline_TR  │
│  42 fichiers│  │   8 fichiers│  │ 42 fichiers │  │  8 fichiers │
│             │  │             │  │             │  │             │
│ [Télécharger│  │ [Télécharger│  │ [Télécharger│  │ [Télécharger│
│    tout]    │  │    tout]    │  │    tout]    │  │    tout]    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```
Les fichiers viennent de Supabase (tables team_matches + timelines).
Download = reconstruction JSON/CSV côté browser + `<a download>`.

---

## 📌 TODO (bloqué — en attente doc API LCU)

- [ ] **PRIORITÉ 1** : Recevoir le fichier GitHub / doc API LCU
- [ ] Choisir l'architecture après lecture de la doc
- [ ] Mapper les endpoints LCU exacts (match history, timelines, etc.)
- [ ] Définir ce qu'on stocke dans Supabase (nouvelles tables ou tables existantes ?)
- [ ] Rédiger la doc utilisateur (comment trouver + copier le lockfile)
- [ ] Coder — seulement après validation archi

---

*Dernière mise à jour : 2026-03-12*
