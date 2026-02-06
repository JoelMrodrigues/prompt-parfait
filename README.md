# LoL Draft Pro 🎮

Application web professionnelle pour simuler et analyser des drafts League of Legends en mode tournoi.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff)

## ✨ Fonctionnalités

- 🎯 **Draft Simulator** : Simulateur réaliste de draft mode tournoi
- 📊 **Stats Avancées** : Import et analyse de CSV (champions, joueurs, tournois)
- 👥 **Team Management** : Gestion d'équipe avec pools de champions
- 🔐 **Authentification** : Système de comptes sécurisé via Supabase
- 🎨 **Design Moderne** : Interface minimaliste-futuriste avec animations fluides

## 🚀 Quick Start

### Prérequis

- Node.js 18+ 
- Compte Supabase (gratuit)

### Installation

```bash
# Cloner le repo
git clone <your-repo-url>
cd lol-draft-pro

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase
```

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter les scripts SQL de `SUPABASE_SETUP.md`
3. Copier l'URL et la clé anonyme dans `.env`

### Lancement

```bash
npm run dev
```

L'app sera disponible sur `http://localhost:5173`

## 📚 Documentation

- 📖 [Guide de déploiement](DEPLOY.md) - Déployer sur Vercel
- 🗄️ [Setup Supabase](SUPABASE_SETUP.md) - Configuration de la base de données
- 🎮 [Intégration Champions](CHAMPIONS.md) - Ajouter les données de champions
- 📊 [Import CSV Stats](CSV_STATS.md) - Gérer les statistiques
- 🏗️ [Structure du projet](PROJECT_STRUCTURE.md) - Architecture complète

## 🛠️ Stack Technique

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Hosting**: Vercel

## 📁 Structure

```
src/
├── components/
│   ├── draft/       # Simulateur de draft
│   ├── team/        # Gestion d'équipe
│   ├── stats/       # Statistiques
│   ├── layout/      # Header, Layout
│   └── common/      # Composants réutilisables
├── pages/           # Pages principales
├── contexts/        # AuthContext
├── hooks/           # useTeam, etc.
└── lib/             # Supabase, utils
```

## 🎨 Design System

### Couleurs
```css
--dark-bg: #0a0a0a
--dark-card: #1a1a1a
--dark-border: #2a2a2a
--accent-blue: #3b82f6
--accent-gold: #fbbf24
```

### Typographie
- **Titres**: Orbitron
- **Corps**: Inter

## 🗺️ Roadmap

- ✅ Phase 1: Setup & Base
- ✅ Phase 2: Authentification
- ✅ Phase 3: Page Draft (Simulateur)
- ✅ Phase 4: Page Équipe
- ✅ Phase 5: Page Stats
- ✅ Phase 6: Page Accueil
- ✅ Phase 7: Polish & Déploiement

## 🚧 Améliorations futures

- [ ] Timer par phase de draft
- [ ] Suggestions de picks intelligentes
- [ ] Export de draft en image
- [ ] Graphiques de stats avancés
- [ ] Mode draft en équipe (WebSocket)
- [ ] Application mobile (React Native)

## 📝 Scripts disponibles

```bash
npm run dev      # Développement
npm run build    # Build production
npm run preview  # Preview du build
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour les changements majeurs, ouvrir d'abord une issue.

## 📄 License

MIT

## 🙏 Crédits

- Données champions via [Riot Games Data Dragon](https://developer.riotgames.com/docs/lol)
- Design inspiré de [dpm.lol](https://dpm.lol)
- Icônes par [Lucide](https://lucide.dev)

---

Made with ❤️ for the League of Legends community
