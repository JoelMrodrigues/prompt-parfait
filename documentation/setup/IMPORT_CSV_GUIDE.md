# 📊 Guide d'import des CSV vers Supabase

## 🎯 Objectif

Importer les gros fichiers CSV (75-105 Mo) dans Supabase pour éviter de charger tout en mémoire côté navigateur.

---

## 📋 Étapes

### 1️⃣ Créer la table Supabase

1. Va sur [supabase.com](https://supabase.com)
2. Ouvre ton projet
3. Va dans **SQL Editor**
4. Copie-colle le contenu de `supabase/supabase-schema.sql`
5. Clique sur **Run**

✅ La table `pro_stats` est créée avec tous les index !

---

### 2️⃣ Préparer les fichiers

1. Crée un dossier `data/csv/` dans le projet
2. Place tes CSV dedans et renomme-les :
   ```
   data/csv/S10.csv
   data/csv/S11.csv
   data/csv/S12.csv
   data/csv/S13.csv
   data/csv/S14.csv
   data/csv/S15.csv
   data/csv/S16.csv
   ```

---

### 3️⃣ Configurer les variables d'environnement

Dans ton fichier `.env`, ajoute :

```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta-clé-anon-ici
```

---

### 4️⃣ Installer les dépendances

```bash
npm install dotenv
```

---

### 5️⃣ Lancer l'import

```bash
node scripts/import-csv-to-supabase.js
```

⏳ **Temps estimé :** 10-30 minutes selon la taille des fichiers et ta connexion.

---

## 🔍 Vérification

Après l'import, va dans Supabase > **Table Editor** > `pro_stats` et vérifie que les données sont bien là !

---

## ⚡ Après l'import

Le site chargera les données depuis Supabase avec :
- ✅ Pagination automatique
- ✅ Filtres rapides
- ✅ Recherche optimisée
- ✅ Pas de lag !

---

## 🐛 En cas de problème

**Erreur "Table pro_stats does not exist"**
→ Tu as oublié l'étape 1 (créer la table)

**Erreur "Invalid API key"**
→ Vérifie ton `.env`

**Timeout**
→ Réduis `BATCH_SIZE` dans le script (ligne 132)
