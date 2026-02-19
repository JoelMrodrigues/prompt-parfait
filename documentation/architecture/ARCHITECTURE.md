# 🏗️ Architecture du projet

## 📦 Comprendre les 2 "projets"

### 🔵 PROJET CURSOR (sur ton PC)

```
📁 C:\Users\joel.rodrigues\Desktop\prompt-parfait\
├── 📁 src/                     ← Code React
├── 📁 public/                  ← Champions, images
├── 📁 data/csv/                ← Tes 7 fichiers CSV
├── 📁 scripts/                 ← Script d'import
├── 📄 .env                     ← Clés Supabase (à configurer)
├── 📄 package.json
└── 📁 supabase/                ← Scripts SQL (schémas, migrations)
    └── supabase-schema.sql    ← À copier dans Supabase
```

**C'est ton code** = Tu l'ouvres dans **Cursor** (ton éditeur)

---

### 🟢 PROJET SUPABASE (dans le cloud)

```
🌐 https://ton-projet.supabase.co
├── 📊 Table: pro_stats         ← Données des CSV (millions de lignes)
├── 🔑 API Keys                 ← Pour connecter Cursor à Supabase
└── ⚙️ Settings
```

**C'est ta base de données** = Tu la gères sur **supabase.com** (site web)

---

## 🔄 Comment ils communiquent ?

```
┌─────────────────────────────────────────────────────────┐
│                    TON NAVIGATEUR                       │
│                  http://localhost:5173                  │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │  PAGE STATS                                  │     │
│  │  "Affiche-moi les stats S16"                 │     │
│  └──────────────────┬───────────────────────────┘     │
│                     │                                   │
│                     │ ① Requête                         │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────┐     │
│  │  src/lib/supabaseStats.js                    │     │
│  │  "Je demande à Supabase"                     │     │
│  └──────────────────┬───────────────────────────┘     │
└────────────────────┼───────────────────────────────────┘
                     │
                     │ ② Appel API avec les clés .env
                     │
                     ▼
         ┌───────────────────────────┐
         │   🌐 SUPABASE CLOUD       │
         │                           │
         │  📊 Table: pro_stats      │
         │     ├── S10 (15k lignes)  │
         │     ├── S11 (18k lignes)  │
         │     ├── S12 (20k lignes)  │
         │     ├── S13 (22k lignes)  │
         │     ├── S14 (25k lignes)  │
         │     ├── S15 (28k lignes)  │
         │     └── S16 (30k lignes)  │
         │                           │
         │  "Voici 100 résultats"    │
         └───────────┬───────────────┘
                     │
                     │ ③ Réponse (données)
                     │
                     ▼
         ┌───────────────────────────┐
         │   TON NAVIGATEUR          │
         │   Affiche le tableau ✅   │
         └───────────────────────────┘
```

---

## 🔐 Le fichier .env : Le pont entre les 2

```env
# Dans C:\Users\joel.rodrigues\Desktop\prompt-parfait\.env

VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
                  ↑
                  └── URL de TON projet Supabase

VITE_SUPABASE_ANON_KEY=eyJhbGc...
                       ↑
                       └── Clé pour se connecter
```

**Sans ce fichier** → Ton site ne peut pas parler à Supabase ❌  
**Avec ce fichier** → Ton site charge les données depuis Supabase ✅

---

## 📊 Flux de données CSV → Supabase

```
┌──────────────────────────────────────────────────────┐
│  ÉTAPE 1 : Les CSV sont sur ton PC                   │
│  📁 data/csv/S10.csv (85 Mo)                          │
│  📁 data/csv/S11.csv (105 Mo)                         │
│  📁 data/csv/S12.csv (92 Mo)                          │
│  ...                                                  │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ ② Script d'import
                   │ node scripts/import-csv-to-supabase.js
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  ÉTAPE 2 : Parse les CSV (ligne par ligne)           │
│  - Lit le CSV                                         │
│  - Convertit en objets JavaScript                    │
│  - Batch de 1000 lignes                              │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ ③ Upload vers Supabase
                   │ (utilise les clés du .env)
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  ÉTAPE 3 : Stockage dans Supabase                    │
│  🌐 Table pro_stats (dans le cloud)                  │
│  - 158,000+ lignes au total                          │
│  - Index optimisés pour recherche rapide             │
│  - Accessible depuis n'importe où                    │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 Résumé : Qui fait quoi ?

| Quoi | Où | Outil |
|------|-----|-------|
| **Code du site** | Sur ton PC | Cursor |
| **Base de données** | Dans le cloud | Supabase (site web) |
| **Connexion entre les 2** | Fichier .env | Éditeur de texte |
| **Import CSV** | Terminal Cursor | `node scripts/import-csv-to-supabase.js` |
| **Affichage des stats** | Navigateur | http://localhost:5173/stats |

---

## 💡 En résumé

1. **Cursor** = Ton éditeur de code (où tu travailles)
2. **Supabase** = Ton hébergeur de base de données (site web)
3. **Projet Cursor** = Le code sur ton PC
4. **Projet Supabase** = La base de données dans le cloud
5. **Fichier .env** = Le lien entre les 2

**Quand le guide dit "ouvre ton projet"** :
- Si c'est dans Cursor → Ouvre Cursor
- Si c'est sur Supabase → Ouvre supabase.com dans ton navigateur

---

**Tout clair ? 😊**

Si tu as encore des questions, demande-moi !
