# 🔄 Guide de mise à jour S16

## 🎯 Pourquoi cette fonctionnalité ?

La saison S16 est **en cours** → Nouveaux matchs chaque jour !  
Au lieu de retélécharger et réimporter tout le CSV, tu peux maintenant faire une **mise à jour incrémentale** qui n'ajoute que les nouveaux matchs.

---

## 📋 2 façons de mettre à jour S16

### **Méthode 1 : Ligne de commande** 💻

1. Ouvre un terminal dans Cursor
2. Lance la commande :
   ```bash
   npm run update-s16
   ```
3. Attends 10-30 secondes
4. ✅ Terminé !

**Avantages** :
- Rapide
- Peut être automatisé (cron job, GitHub Actions)
- Affiche les détails dans le terminal

---

### **Méthode 2 : Bouton dans l'interface** 🖱️

1. Va sur la page **Stats** du site
2. Sélectionne la saison **S16**
3. Tu verras un bouton **"🔄 Mettre à jour S16"** (en or)
4. Clique dessus
5. Attends que ça finisse
6. ✅ La page se recharge automatiquement !

**Avantages** :
- Plus visuel
- Pas besoin du terminal
- Affiche la progression en temps réel

---

## 🔍 Comment ça fonctionne ?

```
1. 📥 Télécharge le CSV S16 depuis Google Drive
   ↓
2. 🔍 Compare avec les matchs déjà en base
   ↓
3. 📊 Filtre uniquement les NOUVEAUX matchs
   ↓
4. 📤 Insère les nouveaux matchs dans Supabase
   ↓
5. ✅ Terminé !
```

**Résultat** :
- Pas de doublon
- Rapide (10-30 sec au lieu de 10-30 min)
- Pas besoin de télécharger manuellement le CSV

---

## 📅 Fréquence recommandée

- **Avant un match important** : Mets à jour pour avoir les stats les plus récentes
- **1 fois par jour** : Le matin pour avoir les matchs de la veille
- **Après un gros tournoi** : Pour avoir les nouvelles données

---

## ⚠️ Notes importantes

### RLS (Row Level Security)

Si tu as **réactivé le RLS** après l'import initial, tu dois le désactiver à nouveau pour la mise à jour :

```sql
ALTER TABLE pro_stats DISABLE ROW LEVEL SECURITY;
```

Sinon tu auras l'erreur : `new row violates row-level security policy`

### Google Drive

Le CSV est téléchargé directement depuis Google Drive. Si le lien change ou si le fichier est supprimé, la mise à jour ne fonctionnera plus.

Pour changer l'ID du fichier :
- Ouvre `scripts/update-s16.js`
- Ligne 18 : Change `S16_FILE_ID`
- Ouvre `src/lib/updateS16.js`
- Ligne 7 : Change `S16_FILE_ID`

---

## 🚀 Automatisation (Optionnel - Avancé)

Tu peux automatiser la mise à jour chaque jour avec **GitHub Actions** :

1. Crée `.github/workflows/update-s16.yml` :
   ```yaml
   name: Update S16
   on:
     schedule:
       - cron: '0 8 * * *'  # Tous les jours à 8h
     workflow_dispatch:  # Permet de lancer manuellement
   
   jobs:
     update:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm install
         - run: npm run update-s16
           env:
             VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
   ```

2. Ajoute tes secrets dans GitHub :
   - Settings → Secrets → New repository secret
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. ✅ La mise à jour se fera automatiquement chaque matin !

---

## 🎉 Résumé

| Méthode | Commande | Temps | Automatisable |
|---------|----------|-------|---------------|
| **Ligne de commande** | `npm run update-s16` | 10-30s | ✅ Oui (GitHub Actions) |
| **Bouton interface** | Clic sur le bouton | 10-30s | ❌ Non (manuel) |
| **Import complet** | `node scripts/import-csv-to-supabase.js` | 10-30min | ✅ Oui mais long |

---

**Questions ? Demande-moi ! 😊**
