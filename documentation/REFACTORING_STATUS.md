# État de la Refactorisation

## ✅ Terminé

### 1. Structure de Base
- ✅ Création de la nouvelle structure par fonctionnalité
- ✅ Dossiers `hooks/` et `components/` par page

### 2. Draft Page
- ✅ Créé `useDraft.js` - Logique métier du draft
- ✅ Créé `useChampions.js` - Chargement des champions
- ✅ Refactorisé `DraftPage.jsx` - Orchestration uniquement
- ✅ Supprimé l'ancien `Draft.jsx`

## 🔄 En Cours

### 3. Team Page
- ⏳ À refactoriser avec hooks séparés
- ⏳ Créer `usePlayerSync.js` pour OP.gg
- ⏳ Découper en composants plus petits

### 4. Stats Pages
- ⏳ Créer hooks pour chaque page stats
- ⏳ Créer services API
- ⏳ Découper en composants

## 📋 À Faire

### 5. Services et Utils
- [ ] Créer `lib/api/statsApi.js`
- [ ] Créer `lib/api/teamApi.js`
- [ ] Créer `lib/services/championService.js`
- [ ] Créer `lib/utils/formatters.js`

### 6. Nettoyage Final
- [ ] Vérifier tous les imports
- [ ] Supprimer les fichiers inutilisés
- [ ] Optimiser les performances

---

## 📊 Progression: 15%

**Prochaines étapes:**
1. Refactoriser Team Page
2. Refactoriser Stats Pages
3. Créer services API
4. Nettoyage final
