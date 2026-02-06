# 📊 Stats depuis Google Drive

## ✅ Configuration Terminée

Les CSV de stats sont maintenant chargés **automatiquement** depuis Google Drive.

---

## 🔗 Liens Configurés

| Saison | Google Drive ID | Statut |
|--------|-----------------|--------|
| S16 | `1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm` | ✅ |
| S15 | `1v6LRphp2kYciU4SXp0PCjEMuev1bDejc` | ✅ |
| S14 | `1IjIEhLc9n8eLKeY-yh_YigKVWbhgGBsN` | ✅ |
| S13 | `1XXk2LO0CsNADBB1LRGOV5rUpyZdEZ8s2` | ✅ |
| S12 | `1EHmptHyzY8owv0BAcNKtkQpMwfkURwRy` | ✅ |
| S11 | `1fzwTTz77hcnYjOnO9ONeoPrkWCoOSecA` | ✅ |
| S10 | `1dlSIczXShnv1vIfGNvBjgk-thMKA5j7d` | ✅ |

---

## 🚀 Utilisation

### Page Stats

1. Aller sur `/stats`
2. Sélectionner une saison (S16, S15, etc.)
3. Les données se chargent automatiquement depuis Google Drive
4. Tri, filtres et recherche disponibles

### Features

- ✅ Chargement automatique au changement de saison
- ✅ Cache pour éviter les rechargements
- ✅ Bouton "Recharger" pour forcer le refresh
- ✅ Import CSV manuel toujours possible
- ✅ Indicateur de chargement
- ✅ Gestion d'erreurs

---

## 🔧 Configuration Technique

### Fichier : `src/lib/googleDriveLoader.js`

```javascript
export const SEASON_DATA = {
  S16: '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm',
  S15: '1v6LRphp2kYciU4SXp0PCjEMuev1bDejc',
  // ... etc
}
```

### Fonctions disponibles :

- `loadSeasonData(season)` - Charger CSV depuis Drive
- `loadSeasonDataCached(season)` - Avec cache
- `getAvailableSeasons()` - Liste des saisons
- `clearCache()` - Vider le cache

---

## ⚠️ Permissions Google Drive

**Important** : Les fichiers doivent être **publics** ou **accessibles via le lien**.

### Vérifier les permissions :

1. Ouvrir le fichier sur Google Drive
2. Cliquer "Partager"
3. Modifier l'accès : "Tous les utilisateurs disposant du lien"
4. Rôle : "Lecteur"

Si les fichiers ne sont pas accessibles, l'app affichera une erreur.

---

## 🧪 Test

```bash
# Aller sur la page Stats
http://localhost:5173/stats

# Sélectionner S16
# Attendre 2-3 secondes (chargement depuis Drive)
# Les données s'affichent !
```

---

## 📝 Ajouter une Nouvelle Saison

### 1. Uploader le CSV sur Google Drive

### 2. Récupérer l'ID du fichier

URL : `https://drive.google.com/file/d/1ABC123XYZ/view`  
ID : `1ABC123XYZ`

### 3. Ajouter dans `src/lib/googleDriveLoader.js`

```javascript
export const SEASON_DATA = {
  S17: '1ABC123XYZ', // Nouvelle saison
  S16: '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm',
  // ...
}
```

### 4. C'est tout !

La nouvelle saison apparaîtra automatiquement dans le sélecteur.

---

## 🐛 Problèmes Fréquents

### "Erreur de chargement"

**Causes** :
- Fichier Google Drive privé
- ID incorrect
- Problème réseau

**Solution** :
1. Vérifier que le fichier est public
2. Re-copier l'ID depuis l'URL
3. Tester avec le bouton "Recharger"

### "Données vides"

**Cause** : Format CSV incorrect

**Solution** :
- Vérifier que le CSV a des en-têtes
- Format attendu : `Champion,Winrate,Pickrate,...`

---

## 💡 Optimisations

### Cache Intelligent

Les données sont mises en cache après le premier chargement :
- Changement de saison = rechargement
- Re-sélection de la même saison = cache utilisé
- Bouton "Recharger" = force le refresh

### Performance

- Fichiers CSV < 1 MB : chargement instantané
- Fichiers > 5 MB : peut prendre quelques secondes

---

## 📚 Ressources

- **Documentation Drive API** : https://developers.google.com/drive
- **Format CSV** : Voir `CSV_STATS.md`
- **Parser CSV** : `src/lib/csvParser.js`

---

**✅ Tout est configuré et prêt à l'emploi !**
