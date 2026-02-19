# 📂 Dossier CSV

## 📥 Instructions

Place tes 7 fichiers CSV ici avec ces noms **EXACTS** :

```
S10.csv
S11.csv
S12.csv
S13.csv
S14.csv
S15.csv
S16.csv
```

---

## ⚠️ Important

- ✅ Les noms de fichiers doivent être **exactement** comme ci-dessus (sensible à la casse)
- ✅ Format : CSV avec tabulations (TSV)
- ✅ Taille : Peu importe (le script gère les gros fichiers)

---

## 🚀 Après avoir placé les fichiers

Lance le script d'import :

```bash
node scripts/import-csv-to-supabase.js
```

**Durée estimée :** 10-30 minutes selon la taille et ta connexion.

---

## 📊 Contenu attendu

Chaque CSV doit contenir les colonnes de stats professionnelles LoL :
- gameid, league, year, split, playoffs, date, patch
- playername, playerid, teamname, teamid
- champion, position (top/jng/mid/bot/sup)
- kills, deaths, assists, gold, cs, damage, etc.

Voir `supabase/supabase-schema.sql` pour la liste complète des colonnes.

---

## 🔍 Vérification

Après l'import, vérifie dans Supabase :
- Table Editor → `pro_stats`
- Tu devrais voir des milliers de lignes !
