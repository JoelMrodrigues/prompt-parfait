# Proposition de fonctionnalités : assigner les champions aux colonnes S / A / B / C

## Option 1 : Drag & Drop (glisser-déposer)
- **Principe** : Glisser un champion depuis la grille vers la colonne voulue
- **Avantages** : Intuitif, rapide, standard sur desktop
- **Inconvénients** : Moins pratique sur mobile, nécessite une lib (ex: `@dnd-kit/core`)

## Option 2 : Cliquer sur la colonne puis sur le champion
- **Principe** : 1) Cliquer sur S, A, B ou C pour le sélectionner (colonne en surbrillance) 2) Cliquer sur un champion dans la grille pour l’ajouter à cette colonne
- **Avantages** : Simple, fonctionne bien au clavier/tactile
- **Inconvénients** : Deux clics par champion

## Option 3 : Menu contextuel (clic droit)
- **Principe** : Clic droit sur un champion → menu « Ajouter à S / A / B / C »
- **Avantages** : Actions explicites
- **Inconvénients** : Clic droit peu naturel sur mobile

## Option 4 : Double-clic + popup de choix
- **Principe** : Double-clic sur un champion → popup « Choisir la colonne : S / A / B / C »
- **Avantages** : Flexible, pas de sélection de colonne préalable
- **Inconvénients** : Plus de clics, popup supplémentaire

## Option 5 : Bouton « + » sur chaque colonne
- **Principe** : Un bouton « + » dans chaque colonne ouvre une liste/modal des champions à ajouter
- **Avantages** : Parfait pour ajouter plusieurs champions à une colonne
- **Inconvénients** : Navigation différente, modal possiblement lourde

---

## Recommandation : combiner **Option 1 + Option 2**

- **Mode principal (desktop)** : Drag & drop depuis la grille vers la colonne
- **Mode secondaire** : Sélection de colonne (S/A/B/C surlignée) + clic sur un champion pour l’ajouter
- **Mobile** : Seul le mode « sélection colonne + clic » (sans drag)

Cela garde une UX simple tout en couvrant desktop et mobile.
