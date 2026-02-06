# Guide de Déploiement

## Prérequis

1. **Compte Supabase** : [supabase.com](https://supabase.com)
2. **Compte Vercel** : [vercel.com](https://vercel.com)

## Étape 1 : Configuration Supabase

### 1.1 Créer le projet
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier l'URL du projet et la clé anonyme

### 1.2 Créer les tables
1. Aller dans l'éditeur SQL de Supabase
2. Copier/coller le contenu de `SUPABASE_SETUP.md`
3. Exécuter les requêtes SQL pour créer toutes les tables

### 1.3 Activer l'authentification
1. Aller dans Authentication > Settings
2. Vérifier que "Enable Email Confirmations" est configuré selon vos besoins
3. Configurer les URLs de redirection si nécessaire

## Étape 2 : Déploiement sur Vercel

### 2.1 Via GitHub (recommandé)
1. Pusher le projet sur GitHub
2. Aller sur [vercel.com](https://vercel.com)
3. Cliquer sur "Import Project"
4. Sélectionner votre repo GitHub
5. Configurer les variables d'environnement :
   - `VITE_SUPABASE_URL` : URL de votre projet Supabase
   - `VITE_SUPABASE_ANON_KEY` : Clé anonyme de Supabase
6. Déployer !

### 2.2 Via CLI Vercel
```bash
npm install -g vercel
vercel login
vercel

# Ajouter les variables d'environnement
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Déployer en production
vercel --prod
```

## Étape 3 : Configuration post-déploiement

### 3.1 Ajouter le domaine Vercel à Supabase
1. Copier l'URL de votre site Vercel (ex: `your-app.vercel.app`)
2. Dans Supabase : Authentication > URL Configuration
3. Ajouter l'URL dans "Site URL" et "Redirect URLs"

### 3.2 Tester l'application
1. Créer un compte utilisateur
2. Tester la création d'une équipe
3. Tester le simulateur de draft
4. Importer des CSV/JSON de stats

## Variables d'environnement requises

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Commandes utiles

```bash
# Développement local
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

## Troubleshooting

### Erreur de connexion Supabase
- Vérifier que les variables d'environnement sont bien définies
- Vérifier que les tables sont créées
- Vérifier les policies RLS dans Supabase

### Erreur 404 sur les routes
- Vérifier que `vercel.json` est présent
- Le fichier configure les rewrites pour React Router

### Problème d'authentification
- Vérifier les URLs de redirection dans Supabase
- Vérifier que l'email confirmation est configuré correctement

## Support

Pour toute question, consulter :
- [Documentation Vite](https://vitejs.dev)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Vercel](https://vercel.com/docs)
