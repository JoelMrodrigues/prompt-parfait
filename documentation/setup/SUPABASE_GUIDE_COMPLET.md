# 🚀 GUIDE SUPABASE ULTRA DÉTAILLÉ (Débutant)

## 📌 C'est quoi Supabase ?

Supabase = Une base de données en ligne (comme un Excel géant dans le cloud).  
Tu vas créer un **projet Supabase** (sur le site supabase.com) pour stocker tes stats LoL.

---

## 🎯 PARTIE 1 : CRÉER TON COMPTE SUPABASE

### Étape 1.1 : Aller sur Supabase

1. Ouvre ton **navigateur** (Chrome, Firefox, Edge...)
2. Va sur **https://supabase.com**
3. Clique sur **"Start your project"** (ou "Sign up" en haut à droite)

### Étape 1.2 : Créer un compte

Tu as 2 options :

**Option A : Avec GitHub (recommandé)**
1. Clique sur **"Continue with GitHub"**
2. Connecte-toi à GitHub
3. Autorise Supabase

**Option B : Avec Email**
1. Entre ton email
2. Entre un mot de passe
3. Vérifie ton email (tu recevras un lien de confirmation)
4. Clique sur le lien dans l'email

✅ **Tu es maintenant connecté à Supabase !**

---

## 🎯 PARTIE 2 : CRÉER TON PROJET SUPABASE

### Étape 2.1 : Créer un nouveau projet

1. Tu arrives sur la **page d'accueil** de Supabase
2. Tu vois un bouton **"New Project"** (ou "+ New project")
3. **Clique dessus**

### Étape 2.2 : Remplir les informations

Tu vas voir un formulaire. Remplis-le comme ça :

1. **Organization** : 
   - Si c'est ta première fois, clique sur **"Create a new organization"**
   - Nom : `Mon Organisation` (ou ce que tu veux)
   - Plan : **Free** (gratuit)

2. **Project name** : 
   - Nom : `prompt-parfait` (ou `lol-draft-stats`)

3. **Database Password** : 
   - Entre un **mot de passe fort**
   - ⚠️ **IMPORTANT : NOTE-LE QUELQUE PART !** Tu en auras besoin plus tard
   - Exemple : `MonMotDePasse2026!`

4. **Region** : 
   - Choisis **"West EU (Ireland)"** (le plus proche de la France)

5. **Pricing Plan** :
   - Laisse sur **"Free"** (0$/mois)

6. Clique sur **"Create new project"**

⏳ **Attends 1-2 minutes** pendant que Supabase crée ton projet...

✅ **Ton projet est créé !**

---

## 🎯 PARTIE 3 : RÉCUPÉRER TES CLÉS API

### Étape 3.1 : Aller dans les Settings

1. Tu es sur la **page de ton projet** Supabase
2. Dans la **barre de gauche**, clique sur **⚙️ Settings** (tout en bas)
3. Puis clique sur **"API"** (dans le menu Settings)

### Étape 3.2 : Copier les clés

Tu vas voir une page avec plusieurs informations. Tu as besoin de **2 clés** :

#### 📋 CLÉ 1 : Project URL

1. Cherche la section **"Project URL"**
2. Tu vois quelque chose comme : `https://abcdefghijk.supabase.co`
3. Clique sur l'**icône de copie** (📋) à droite
4. ✅ **COLLE-LA DANS UN BLOC-NOTES** (tu en auras besoin dans 2 min)

#### 📋 CLÉ 2 : anon public

1. Cherche la section **"Project API keys"**
2. Tu vois **2 clés** : 
   - `anon` `public`
   - `service_role` `secret`
3. ⚠️ **Prends la clé `anon` `public`** (PAS la service_role !)
4. C'est une **très longue chaîne** qui commence par `eyJ...`
5. Clique sur l'**icône de copie** (📋) à droite
6. ✅ **COLLE-LA DANS TON BLOC-NOTES**

**Exemple de ce que tu dois avoir dans ton bloc-notes :**
```
Project URL:
https://abcdefghijk.supabase.co

anon public key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg5MDEyMzQsImV4cCI6MTk5NDQ3NzIzNH0.xxxxxxxxxxxxxxxxx
```

---

## 🎯 PARTIE 4 : CRÉER LA TABLE DANS SUPABASE

### Étape 4.1 : Ouvrir le SQL Editor

1. Dans la **barre de gauche** de Supabase
2. Clique sur **🔧 SQL Editor** (icône avec des outils)
3. Tu arrives sur une page avec un **éditeur de code**

### Étape 4.2 : Copier le SQL

1. **RETOURNE DANS CURSOR** (ton éditeur de code)
2. Ouvre le fichier **`supabase-schema.sql`** (il est à la racine du projet)
3. **Sélectionne TOUT le contenu** du fichier (Ctrl+A ou Cmd+A)
4. **Copie** (Ctrl+C ou Cmd+C)

### Étape 4.3 : Coller et exécuter le SQL

1. **RETOURNE SUR SUPABASE** (dans ton navigateur)
2. Dans le **SQL Editor**, tu vois une **grande zone de texte**
3. **Colle** le contenu du fichier `supabase-schema.sql` (Ctrl+V ou Cmd+V)
4. En bas à droite, clique sur le bouton **"Run"** (ou appuie sur Ctrl+Enter)

⏳ **Attends 2-3 secondes...**

✅ **Tu devrais voir un message "Success"** en vert !

### Étape 4.4 : Vérifier que la table est créée

1. Dans la **barre de gauche**, clique sur **📊 Table Editor**
2. Tu devrais voir une table appelée **`pro_stats`**
3. Clique dessus
4. Pour l'instant, elle est **vide** (0 rows) → C'est normal !

✅ **Ta table est prête à recevoir les données !**

---

## 🎯 PARTIE 5 : CONFIGURER TON PROJET CURSOR

### Étape 5.1 : Créer le fichier .env

1. **RETOURNE DANS CURSOR** (ton éditeur de code)
2. À la **racine du projet** (là où il y a `package.json`)
3. Tu devrais déjà avoir un fichier **`.env`**
4. Si tu ne l'as pas, **crée-le** :
   - Clic droit dans l'explorateur de fichiers
   - "New File"
   - Nomme-le **exactement** `.env` (avec le point au début)

### Étape 5.2 : Ajouter les clés dans .env

1. **Ouvre le fichier `.env`** dans Cursor
2. **Reprends ton bloc-notes** avec les 2 clés que tu as copiées
3. Dans le fichier `.env`, **ajoute ces 2 lignes** :

```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg5MDEyMzQsImV4cCI6MTk5NDQ3NzIzNH0.xxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANT :**
- Remplace `https://abcdefghijk.supabase.co` par **TON** Project URL
- Remplace `eyJ...` par **TA** clé anon public
- **Pas d'espace** avant ou après le `=`
- **Pas de guillemets** autour des valeurs

4. **Sauvegarde le fichier** (Ctrl+S ou Cmd+S)

✅ **Ton projet Cursor est maintenant connecté à Supabase !**

---

## 🎯 PARTIE 6 : PLACER LES FICHIERS CSV

### Étape 6.1 : Ouvrir le dossier data/csv

1. Dans **Cursor**, tu vois l'explorateur de fichiers à gauche
2. Tu devrais voir un dossier **`data`** → **`csv`**
3. Si tu ne le vois pas, vérifie qu'il a bien été créé
4. **Ouvre ce dossier** dans ton explorateur de fichiers Windows :
   - Clic droit sur le dossier `csv`
   - "Reveal in File Explorer" (ou "Ouvrir dans l'explorateur")

### Étape 6.2 : Copier tes CSV

1. Tu as tes **7 fichiers CSV** quelque part sur ton PC
2. **Copie-les** dans le dossier `data/csv/`
3. **Renomme-les EXACTEMENT comme ça** (respecte les majuscules) :
   - `S10.csv`
   - `S11.csv`
   - `S12.csv`
   - `S13.csv`
   - `S14.csv`
   - `S15.csv`
   - `S16.csv`

⚠️ **IMPORTANT :** Les noms doivent être **EXACTEMENT** comme ça !

✅ **Tes CSV sont prêts !**

---

## 🎯 PARTIE 7 : LANCER LE SCRIPT D'IMPORT

### Étape 7.1 : Ouvrir le terminal dans Cursor

1. Dans **Cursor**, en haut de la fenêtre
2. Clique sur **"Terminal"** → **"New Terminal"**
3. Un terminal s'ouvre en bas de l'écran

### Étape 7.2 : Vérifier que tu es dans le bon dossier

1. Dans le terminal, tu devrais voir quelque chose comme :
   ```
   PS C:\Users\joel.rodrigues\Desktop\prompt-parfait>
   ```
2. ✅ Si tu vois `prompt-parfait` à la fin, c'est bon !
3. ❌ Si tu es ailleurs, tape : `cd C:\Users\joel.rodrigues\Desktop\prompt-parfait`

### Étape 7.3 : Redémarrer le serveur de dev

1. Si ton serveur `npm run dev` tourne encore, **arrête-le** (Ctrl+C dans le terminal)
2. **Relance-le** :
   ```bash
   npm run dev
   ```
3. Pourquoi ? Pour qu'il **charge les nouvelles variables .env**

### Étape 7.4 : Lancer le script d'import

1. **Ouvre un NOUVEAU terminal** (pour garder le serveur dev qui tourne)
   - Terminal → New Terminal
2. Dans ce nouveau terminal, tape :
   ```bash
   node scripts/import-csv-to-supabase.js
   ```
3. Appuie sur **Entrée**

⏳ **Attends...**

Tu vas voir des messages qui défilent :
```
🚀 Import des CSV vers Supabase

📋 Fichiers à importer:
   - S10: data/csv/S10.csv
   - S11: data/csv/S11.csv
   ...

📂 Import de S10 depuis data/csv/S10.csv...
   📊 15234 lignes détectées
   ✅ Batch 1: 1000 lignes insérées
   ✅ Batch 2: 1000 lignes insérées
   ...
```

⏳ **Durée estimée : 10-30 minutes** (selon la taille des fichiers)

### Étape 7.5 : En cas d'erreur

**Erreur "Table pro_stats does not exist"**
→ Tu as oublié la Partie 4 (créer la table dans Supabase)
→ Retourne à la Partie 4

**Erreur "File not found: data/csv/S10.csv"**
→ Tes CSV ne sont pas au bon endroit ou mal nommés
→ Retourne à la Partie 6

**Erreur "Invalid API key"**
→ Tes clés dans .env sont incorrectes
→ Retourne à la Partie 5

✅ **Import terminé !**

---

## 🎯 PARTIE 8 : VÉRIFIER QUE ÇA A MARCHÉ

### Étape 8.1 : Vérifier dans Supabase

1. **RETOURNE SUR SUPABASE** (dans ton navigateur)
2. Va dans **📊 Table Editor** → **`pro_stats`**
3. Tu devrais voir **des milliers de lignes** !
4. Si tu vois "0 rows" → L'import n'a pas marché

### Étape 8.2 : Tester sur le site

1. **RETOURNE SUR TON SITE** (http://localhost:5173)
2. Va sur la page **"Stats"**
3. Sélectionne une saison (par exemple **S16**)
4. ⏳ Attends 1-2 secondes...
5. ✅ **Les données s'affichent !**

---

## 🎉 FÉLICITATIONS !

Tu as réussi à :
- ✅ Créer un compte Supabase
- ✅ Créer un projet Supabase
- ✅ Créer la table `pro_stats`
- ✅ Configurer ton projet Cursor
- ✅ Importer 7 saisons de stats (des milliers de lignes !)
- ✅ Afficher les données sur ton site

**Ton site est maintenant ultra performant ! ⚡**

---

## 📞 BESOIN D'AIDE ?

Si tu es bloqué à une étape, **DIS-MOI EXACTEMENT OÙ** :
- "Je suis bloqué à la Partie 2, Étape 2.1"
- "J'ai une erreur à la Partie 7, Étape 7.4"
- "Je ne trouve pas le bouton 'New Project' dans Supabase"

Je t'aiderai étape par étape ! 😊
