# 🚀 Getting Started - Guide Complet

## 📋 Checklist de démarrage

### ✅ Étape 1 : Configuration locale (5 min)

1. **Installer les dépendances**
```bash
npm install
```

2. **Créer le fichier `.env`** à la racine :
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. **Lancer le serveur de dev**
```bash
npm run dev
```
→ Ouvrir http://localhost:5173

---

### ✅ Étape 2 : Configuration Supabase (10 min)

1. **Créer un compte** sur [supabase.com](https://supabase.com) (gratuit)

2. **Créer un nouveau projet**
   - Nom : `lol-draft-pro`
   - Mot de passe de la BDD : bien le noter
   - Région : choisir la plus proche

3. **Récupérer les clés**
   - Aller dans Settings > API
   - Copier `Project URL` → `VITE_SUPABASE_URL` dans `.env`
   - Copier `anon public` → `VITE_SUPABASE_ANON_KEY` dans `.env`

4. **Créer les tables**
   - Aller dans SQL Editor
   - Copier/coller le contenu de `SUPABASE_SETUP.md` (toutes les requêtes)
   - Cliquer sur "Run"
   - Vérifier que les 4 tables sont créées (teams, players, champion_pools, team_stats)

5. **Activer l'authentification Email**
   - Aller dans Authentication > Providers
   - Vérifier que "Email" est activé (par défaut)

✅ **Supabase est configuré !**

---

### ✅ Étape 3 : Ajouter les données de champions (optionnel)

**Option A : Utiliser l'API Riot (recommandé)**

Modifier `src/pages/Draft.jsx` ligne 10 :

```javascript
// Remplacer MOCK_CHAMPIONS par :
const [champions, setChampions] = useState([])

useEffect(() => {
  fetch('https://ddragon.leagueoflegends.com/cdn/14.1.1/data/fr_FR/champion.json')
    .then(res => res.json())
    .then(data => {
      const champs = Object.values(data.data).map(c => ({
        id: c.id,
        name: c.name,
        roles: c.tags,
        image: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${c.id}.png`
      }))
      setChampions(champs)
    })
}, [])
```

**Option B : Fichier JSON local**

1. Créer `public/data/champions.json`
2. Y mettre ton JSON de champions
3. Charger via `fetch('/data/champions.json')`

Voir `CHAMPIONS.md` pour plus de détails.

---

### ✅ Étape 4 : Tester l'application

1. **Page d'accueil** (http://localhost:5173)
   - ✓ Animations smooth
   - ✓ Navigation fonctionne

2. **Créer un compte**
   - Cliquer sur "Connexion"
   - Passer en mode "Créer un compte"
   - Email : `test@example.com`
   - Mot de passe : `password123`
   - ✓ Vérifier la redirection après signup

3. **Page Draft** (protégée)
   - Choisir Blue/Red side
   - Démarrer une draft
   - Sélectionner des champions
   - ✓ Vérifier le flow complet

4. **Page Équipe**
   - Créer une équipe
   - Ajouter 5 joueurs
   - Ajouter des champions au pool
   - ✓ Vérifier la sauvegarde

5. **Page Stats**
   - Créer un fichier CSV de test :
     ```csv
     Champion,Winrate,Pickrate,Banrate,KDA,Games
     Aatrox,51.2,8.5,12.3,2.8,1245
     Ahri,52.1,15.2,5.6,3.1,2890
     ```
   - L'importer
   - Tester le tri des colonnes
   - ✓ Vérifier l'affichage

---

### ✅ Étape 5 : Déploiement sur Vercel (15 min)

1. **Pousser sur GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Déployer sur Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Cliquer "Import Project"
   - Connecter GitHub
   - Sélectionner le repo
   - Ajouter les variables d'environnement :
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Cliquer "Deploy"

3. **Configurer Supabase avec l'URL Vercel**
   - Copier l'URL Vercel (ex: `your-app.vercel.app`)
   - Dans Supabase : Authentication > URL Configuration
   - Ajouter dans "Site URL" : `https://your-app.vercel.app`
   - Ajouter dans "Redirect URLs" : `https://your-app.vercel.app/**`

✅ **L'app est en ligne !**

---

## 🎯 Prochaines étapes

### Données à ajouter

- [ ] **Champions** : Voir `CHAMPIONS.md`
- [ ] **Stats CSV** : Voir `CSV_STATS.md`
- [ ] **JSON stats équipe** : Format dans `TeamStatsDisplay.jsx`

### Personnalisation

- [ ] Changer le nom/logo dans `Header.jsx`
- [ ] Modifier les couleurs dans `tailwind.config.js`
- [ ] Ajouter des features (voir `PROJECT_STRUCTURE.md`)

### Optimisations

- [ ] Ajouter Google Analytics
- [ ] Configurer SEO (meta tags)
- [ ] Ajouter PWA (service worker)
- [ ] Optimiser les images

---

## 🐛 Problèmes courants

### "Network error" au démarrage
→ Vérifier que les variables `.env` sont bien définies

### "Not found" sur les routes en production
→ Vérifier que `vercel.json` est présent

### Erreurs d'authentification
→ Vérifier les URLs de redirection dans Supabase

### Champions n'apparaissent pas
→ Vérifier la console pour les erreurs de fetch

### Erreurs Supabase "RLS policy"
→ Vérifier que les policies sont bien créées (voir `SUPABASE_SETUP.md`)

---

## 📚 Documentation complète

- [README.md](README.md) - Présentation générale
- [DEPLOY.md](DEPLOY.md) - Guide de déploiement détaillé
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Structure BDD complète
- [CHAMPIONS.md](CHAMPIONS.md) - Intégration des champions
- [CSV_STATS.md](CSV_STATS.md) - Gestion des statistiques
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Architecture du code

---

## 💡 Astuces

### Dev local rapide
```bash
# Terminal 1 : Dev server
npm run dev

# Terminal 2 : Supabase local (optionnel)
npx supabase start
```

### Build de test
```bash
npm run build
npm run preview
```

### Reset BDD locale
Dans Supabase Dashboard : SQL Editor → Supprimer les tables → Re-run le script

### Hot reload ne fonctionne pas ?
```bash
# Nettoyer le cache Vite
rm -rf node_modules/.vite
npm run dev
```

---

## 🎮 Tester avec des données réelles

### Champions
Utiliser l'API Riot Data Dragon (gratuit, pas de clé requise)

### Stats
Télécharger des CSV depuis :
- [gol.gg](https://gol.gg)
- [op.gg](https://op.gg)
- [u.gg](https://u.gg)

---

## 🤝 Besoin d'aide ?

- **Issues GitHub** : Pour les bugs
- **Discussions** : Pour les questions
- **Discord** : [Lien vers communauté si existant]

---

Bon draft ! 🎯
