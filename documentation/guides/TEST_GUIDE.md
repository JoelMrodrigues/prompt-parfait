# 🧪 Guide de Test - LoL Draft Pro

**Serveur en cours** : http://localhost:5174

---

## ✅ Checklist de Test Rapide (15 min)

### 1️⃣ Page d'Accueil (2 min)
```
✓ Ouvrir http://localhost:5174
✓ Vérifier les animations au scroll
✓ Cliquer sur les cartes features (hover effect)
✓ Tester la navigation (Accueil, Stats, Équipe, Draft)
✓ Vérifier le bouton "Commencer une draft"
```

**Attendu** : Design futuriste, animations smooth, navigation fluide

---

### 2️⃣ Authentification (3 min)

#### Créer un Compte
```
✓ Cliquer "Connexion" (en haut à droite)
✓ Basculer sur "Créer un compte"
✓ Email : test@example.com
✓ Mot de passe : password123
✓ Cliquer "Créer un compte"
✓ Vérifier le spinner pendant le chargement
✓ Vérifier la redirection vers l'accueil
✓ Vérifier que "Connexion" devient "Déconnexion"
```

**Attendu** : Création réussie, redirection automatique, bouton avec loading state

#### Se Déconnecter/Reconnecter
```
✓ Cliquer "Déconnexion"
✓ Vérifier qu'on ne peut plus accéder à /draft (redirection)
✓ Se reconnecter avec les mêmes identifiants
```

---

### 3️⃣ Draft Simulator (5 min) ⭐ NOUVEAUTÉ

#### Chargement des Champions
```
✓ Cliquer sur "Draft" dans le menu
✓ Vérifier le spinner "Chargement des champions..."
✓ Attendre 2-3 secondes (fetch API Riot)
✓ Vérifier que le modal d'initialisation s'affiche
```

**Attendu** : Loading state visible, puis modal

#### Configuration
```
✓ Choisir "Blue Side"
✓ Cocher "Passer les bans"
✓ Cliquer "Démarrer la draft"
```

#### Sélection de Champions
```
✓ Cliquer sur "Pick B1" (bouton pulsant au centre)
✓ Vérifier qu'il y a ~168 champions (pas 5 !)
✓ Tester la barre de recherche : taper "ahri"
✓ Tester les filtres par rôle : cliquer "Mid"
✓ Sélectionner "Ahri"
✓ Vérifier que Ahri apparaît dans Blue Side (position 1)
✓ Vérifier que la phase passe à "Pick R1"
```

**Attendu** : Tous les champions de League of Legends, filtres fonctionnels

#### Test Complet
```
✓ Compléter toute la draft (10 picks)
✓ Tester le bouton "Annuler"
✓ Tester le bouton "Reset"
✓ Vérifier le message "Draft Terminée !"
```

**Attendu** : Logique de draft correcte, boutons fonctionnels

---

### 4️⃣ Gestion d'Équipe (3 min) ⭐ NOUVEAUTÉ

#### Créer une Équipe
```
✓ Aller sur "Équipe"
✓ Nom : "Test Team"
✓ Cliquer "Créer l'équipe"
```

#### Ajouter des Joueurs
```
✓ Cliquer "+ Ajouter un joueur"
✓ Nom : "Faker"
✓ Rôle : "Mid"
✓ Position : 1
✓ Cliquer "Ajouter"
✓ Vérifier que le joueur apparaît avec une carte colorée
```

#### Ajouter un Champion au Pool
```
✓ Cliquer sur l'icône "+" sur la carte du joueur
✓ Rechercher "Ahri"
✓ Sélectionner "Ahri"
✓ Niveau : "Main"
✓ Cliquer "Ajouter"
✓ Vérifier qu'Ahri apparaît dans le pool
```

#### Supprimer un Joueur (avec confirmation) ⭐ NOUVEAU
```
✓ Cliquer sur l'icône poubelle (rouge)
✓ Vérifier que la modale de confirmation s'affiche
✓ Lire le message
✓ Cliquer "Annuler" (d'abord)
✓ Re-cliquer sur la poubelle
✓ Cliquer "Supprimer"
✓ Vérifier que le joueur disparaît
```

**Attendu** : Modale de confirmation avant suppression

#### Importer Stats JSON ⭐ NOUVEAU
```
✓ Scroller en bas de la page
✓ Cliquer "Importer JSON"
✓ Sélectionner : public/data/example-team-stats.json
✓ Vérifier l'affichage des stats :
  - Winrate : 65.5%
  - Région : EUW
  - 5 derniers matchs avec champions
  - Stats détaillées (économie, aggression, etc.)
```

**Attendu** : Stats complètes affichées avec design pro

---

### 5️⃣ Page Stats (2 min) ⭐ NOUVEAUTÉ

#### Importer CSV d'Exemple
```
✓ Aller sur "Stats"
✓ Cliquer "Importer CSV"
✓ Sélectionner : public/data/example-stats.csv
✓ Vérifier que 50 champions s'affichent
✓ Vérifier les colonnes : Champion, Winrate, Pickrate, etc.
```

#### Tester les Filtres
```
✓ Sélectionner saison "S16"
✓ Taper "Ahri" dans la recherche
✓ Vérifier que seul Ahri s'affiche
✓ Effacer la recherche
✓ Cliquer sur l'en-tête "Winrate"
✓ Vérifier que le tableau se trie
✓ Re-cliquer (tri inversé)
```

**Attendu** : Filtres et tri fonctionnels

---

## 🆕 Nouvelles Fonctionnalités Ajoutées

### 1. API Riot Intégrée ✅
- **168 champions réels** (plus de mocks !)
- Chargement automatique depuis Data Dragon
- Images haute qualité
- Mapping intelligent des rôles

**Fichiers** : `src/lib/riotApi.js`, `src/pages/Draft.jsx`

---

### 2. Loading States Partout ✅
- Spinner pendant chargement champions
- État de chargement sur bouton Login
- Messages d'erreur stylisés

**Fichiers** : `src/pages/Draft.jsx`, `src/pages/Login.jsx`

---

### 3. Modale de Confirmation ✅
- Avant suppression de joueur
- 3 types : danger, warning, info
- Personnalisable

**Fichier** : `src/components/common/ConfirmModal.jsx`

---

### 4. Système de Toast (Notifications) ✅
- Success ✅, Error ❌, Info ℹ️
- Auto-dismiss après 3s
- Animations Framer Motion

**Fichiers** : `src/components/common/Toast.jsx`, `src/hooks/useToast.js`

---

### 5. Données d'Exemple ✅
- `public/data/example-stats.csv` - 50 champions S16
- `public/data/example-team-stats.json` - Stats équipe complètes
- Prêts à importer !

---

## 🐛 Tests d'Erreur

### Test 1 : API Riot Down
```
✓ Couper internet
✓ Recharger /draft
✓ Vérifier le message d'erreur
✓ Vérifier le bouton "Retour à l'accueil"
```

### Test 2 : Login Invalide
```
✓ Essayer de se connecter avec mauvais mot de passe
✓ Vérifier le message d'erreur en rouge
✓ Vérifier que le formulaire reste actif
```

### Test 3 : Suppression Annulée
```
✓ Créer un joueur
✓ Cliquer sur la poubelle
✓ Cliquer "Annuler"
✓ Vérifier que le joueur est toujours là
```

---

## 📊 Résultats Attendus

### ✅ Fonctionnel
- [x] Tous les champions chargés (168)
- [x] Draft complète fonctionnelle
- [x] CRUD équipe complet
- [x] Import CSV/JSON
- [x] Authentification
- [x] Navigation

### ✅ UX
- [x] Loading states visibles
- [x] Messages d'erreur clairs
- [x] Confirmations avant actions destructives
- [x] Animations fluides
- [x] Design cohérent

### ✅ Performance
- [x] Chargement < 5s (champions)
- [x] Aucun lag
- [x] Animations 60fps

---

## 🔍 Points à Vérifier Spécialement

### Champions
```
✓ Nombre total : ~168 (tous League of Legends)
✓ Images s'affichent correctement
✓ Filtres par rôle fonctionnent
✓ Champions ban/pick sont grisés
```

### Modales
```
✓ InitModal (draft config)
✓ ChampionSelectModal (sélection)
✓ PlayerModal (add/edit joueur)
✓ AddChampionModal (pool)
✓ ConfirmModal (suppression)
```

### Données
```
✓ CSV parse correctement
✓ JSON stats s'affichent
✓ Supabase sauvegarde
```

---

## 🚨 Problèmes Potentiels

### "Champions ne chargent pas"
**Cause** : API Riot down ou problème réseau  
**Solution** : Vérifier la console (F12), attendre 30s, rafraîchir

### "Modale de confirmation n'apparaît pas"
**Cause** : React strict mode (dev)  
**Solution** : Normal, tester en production build

### "CSV n'importe pas"
**Cause** : Format incorrect  
**Solution** : Utiliser `example-stats.csv` fourni

---

## 📝 Après les Tests

### Si Tout Fonctionne ✅
1. Configurer Supabase (voir `SUPABASE_SETUP.md`)
2. Tester avec compte réel
3. Déployer sur Vercel (voir `DEPLOY.md`)

### Si Problèmes ❌
1. Vérifier la console navigateur (F12)
2. Vérifier la console terminal
3. Lire les messages d'erreur
4. Consulter `IMPROVEMENTS.md` pour détails

---

## 📚 Documentation Complète

- **`GETTING_STARTED.md`** - Guide de démarrage
- **`IMPROVEMENTS.md`** - Détails des améliorations
- **`STATUS.md`** - État du projet
- **`SUPABASE_SETUP.md`** - Config BDD
- **`DEPLOY.md`** - Déploiement

---

## 🎉 Statistiques du Projet

| Métrique | Valeur |
|----------|--------|
| Fichiers code | 41 |
| Composants | 15 |
| Pages | 5 |
| Hooks custom | 2 |
| Champions | 168 |
| Lignes doc | 2000+ |
| Tests manuels | 15 |

---

**🚀 Prêt pour les tests ! Ouvre http://localhost:5174 et commence par la checklist.**

**Temps estimé** : 15-20 minutes pour tout tester  
**Serveur** : Déjà lancé (terminal 4, port 5174)
