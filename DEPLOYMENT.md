# Déploiement — Prompt Parfait (gratuit & sécurisé)

Guide pour déployer l’application afin que tes collègues puissent l’utiliser, en restant gratuit et sécurisé.

## Architecture

| Service | Plateforme | Coût |
|---------|------------|------|
| Frontend | Vercel | Gratuit |
| API | Render | Gratuit |
| Base de données + Auth | Supabase | Gratuit |

**Ordre conseillé** : 1) Supabase → 2) Render (API) → 3) Vercel (Frontend)

---

## Étape 1 — Supabase (Auth & URLs autorisées)

1. Va sur [supabase.com](https://supabase.com) → ton projet
2. **Authentication** → **URL Configuration**
3. Dans **Site URL**, mets l’URL de prod (ex. `https://ton-app.vercel.app`)
4. Dans **Redirect URLs**, ajoute :
   - `https://ton-app.vercel.app/**`
   - `https://ton-api.onrender.com/**` (ou l’URL de ton API)
   - `http://localhost:5173/**` (pour le dev local)

---

## Étape 2 — Backend API sur Render

1. Va sur [render.com](https://render.com) et connecte ton repo GitHub
2. **New** → **Web Service**
3. Choisis le repo `prompt-parfait`
4. Config :
   - **Name** : `prompt-parfait-api` (ou autre)
   - **Root Directory** : `server`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. **Environment** → ajoute :
   - `RIOT_API_KEY` = ta clé Riot (developer.riotgames.com)
   - `FRONTEND_URL` = `https://ton-app.vercel.app` (remplace par ton URL Vercel)
6. **Create Web Service**
7. Une fois déployé, note l’URL (ex. `https://prompt-parfait-api.onrender.com`)

> Sur le plan gratuit, le service s’arrête après 15 min d’inactivité. Le premier appel peut prendre ~30 s.

---

## Étape 3 — Frontend sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte ton repo GitHub
2. **Add New** → **Project** → sélectionne `prompt-parfait`
3. Config :
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. **Environment Variables** → ajoute (déploie l’API Render avant pour avoir son URL) :
   - `VITE_DPM_API_URL` = `https://prompt-parfait-api.onrender.com` (URL de ton API Render)
   - `VITE_SUPABASE_URL` = URL Supabase (Dashboard → Settings → API)
   - `VITE_SUPABASE_ANON_KEY` = clé anon Supabase
5. **Deploy**

---

## Étape 4 — Vérifications

1. **HTTPS** : Vercel et Render fournissent le SSL.
2. **CORS** : `FRONTEND_URL` limite les requêtes au domaine du frontend.
3. **Secrets** : `RIOT_API_KEY` reste côté backend uniquement, jamais dans le frontend.

---

## Option alternative — Tout sur Render (une seule app)

Tu peux héberger frontend + API sur un seul service Render, mais la config est plus lourde. L’option Vercel + Render reste la plus simple.

---

## Créer des comptes pour tes collègues

1. Dans Supabase : **Authentication** → **Users** → **Add user** (email + mot de passe)
2. Ou laisse tes collègues s’inscrire via la page Login (si tu actives Sign Up)
3. Ensuite, invite-les dans l’équipe via « Inviter à rejoindre l’équipe » sur la Vue d’ensemble

---

## Coût

- **Vercel** : gratuit (limites généreuses)
- **Render** : gratuit (service en veille après inactivité)
- **Supabase** : gratuit (500 Mo DB, 50 000 utilisateurs/mois)
