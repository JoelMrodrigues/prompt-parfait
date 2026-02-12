# API DPM.lol (backend)

Petit serveur Express qui récupère **rank** et **top 5 champions** depuis dpm.lol.  
Utilise **axios** (pas de CORS) et **cheerio** avec les vrais sélecteurs de la page.

## Installation

```bash
cd server
npm install
```

## Lancement

```bash
npm start
# ou en mode watch
npm run dev
```

Le serveur écoute sur **http://localhost:3001**.

## Endpoints

- **GET /api/dpm?pseudo=...**  
  Exemple : `?pseudo=Marcel%20le%20Zgeg-BACK`  
  Réponse : `{ success, rank, topChampions, scrapedAt }`

- **GET /api/riot/soloq-top-champions?pseudo=...&region=euw1**  
  Top 5 champions Solo Q **de la saison** (API Riot). Une requête par joueur : le backend fait tous les appels Riot (throttle + cache 15 min).  
  Exemple : `?pseudo=GameName%23TagLine&region=euw1`  
  Réponse : `{ success, topChampions: [{ name, games, wins, winrate, kda, ... }], cached? }`  
  **Variable d'environnement** : `RIOT_API_KEY` (clé API Riot, côté serveur uniquement).

- **GET /health**  
  Health check.

## Utilisation depuis le front (Vite)

1. Démarrer ce serveur (`npm start` dans `server/`).
2. Créer un fichier `.env` à la racine du projet (à côté de `vite.config.js`) :

   ```env
   VITE_DPM_API_URL=http://localhost:3001
   ```

   Pour le top 5 Solo Q via Riot, ajouter dans `server/.env` (ou env du process) :  
   `RIOT_API_KEY=votre_cle_riot`

3. Redémarrer le dev Vite. Le bouton « Synchroniser les données » utilisera l’API au lieu des proxies CORS.

Sans `VITE_DPM_API_URL`, l’app garde le comportement actuel (proxies + extraction côté client).
