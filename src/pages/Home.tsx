import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Swords,
  BarChart3,
  Users,
  Upload,
  Trophy,
  RefreshCw,
  ChevronRight,
  Shield,
  Target,
  TrendingUp,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Swords,
    title: 'Draft Simulator',
    description:
      'Prépare tes picks/bans en conditions réelles. Mode tournoi, phases de ban, historique des drafts sauvegardé.',
    color: 'blue',
  },
  {
    icon: BarChart3,
    title: 'Stats Pro (toutes ligues)',
    description:
      'Winrate, pickrate, banrate de chaque champion dans toutes les ligues pro. Filtré par patch, split et région.',
    color: 'gold',
  },
  {
    icon: Users,
    title: 'Gestion d\'équipe',
    description:
      'Suivi du rang, des champions favoris et de la forme de chaque joueur. Vue roster complète en temps réel.',
    color: 'blue',
  },
  {
    icon: Upload,
    title: 'Analyse de matchs',
    description:
      'Importe tes matchs et visualise la timeline, les avantages CS/or et les décisions clés de chaque partie.',
    color: 'gold',
  },
  {
    icon: Trophy,
    title: 'Pool de Champions',
    description:
      'Classe les champions de chaque joueur par niveau de maîtrise (S/A/B/C). Visualise les options disponibles avant de drafter.',
    color: 'blue',
  },
  {
    icon: RefreshCw,
    title: 'Sync Riot automatique',
    description:
      'Rang, parties jouées et top champions mis à jour en continu depuis l\'API Riot. Zéro saisie manuelle.',
    color: 'gold',
  },
]

const FOR_WHO = [
  {
    icon: Shield,
    title: 'Coachs & Analystes',
    description: 'Prépare les drafts, analyse les matchs et identifie les points faibles de l\'équipe adverse.',
  },
  {
    icon: Target,
    title: 'Équipes compétitives',
    description: 'Du semi-pro à l\'amateur — suis les performances de ton roster et structure tes sessions.',
  },
  {
    icon: TrendingUp,
    title: 'Team Managers',
    description: 'Vue d\'ensemble du roster, suivi de la forme et gestion des pools de champions par joueur.',
  },
]

const STEPS = [
  { num: '01', title: 'Crée ton équipe', desc: 'Ajoute tes joueurs et synchronise leurs comptes Riot en quelques secondes.' },
  { num: '02', title: 'Importe tes matchs', desc: 'Upload tes parties et laisse l\'app analyser timelines et statistiques.' },
  { num: '03', title: 'Prépare tes drafts', desc: 'Utilise les stats pro et le profil de tes joueurs pour drafter efficacement.' },
]

// Mini-mockup du draft board
function DraftPreview() {
  const blue = ['Top', 'Jungle', 'Mid', 'Bot', 'Sup']
  const red = ['Top', 'Jungle', 'Mid', 'Bot', 'Sup']
  const filledBlue = [0, 1, 2]
  const filledRed = [0, 1]

  return (
    <div className="relative rounded-2xl border border-dark-border bg-dark-card overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-bg border-b border-dark-border">
        <span className="text-xs text-accent-blue font-semibold">PHASE 3 · PICKS</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0">
        <div className="p-3 space-y-2 border-r border-dark-border">
          <p className="text-xs text-accent-blue font-bold mb-2 text-center">BLUE</p>
          {blue.map((role, i) => (
            <div key={role} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${filledBlue.includes(i) ? 'bg-accent-blue/20 border border-accent-blue/40' : 'bg-dark-bg/60 border border-dark-border'}`}>
              <div className={`w-6 h-6 rounded ${filledBlue.includes(i) ? 'bg-accent-blue/40' : 'bg-dark-border'}`} />
              <span className={filledBlue.includes(i) ? 'text-white' : 'text-gray-600'}>{role}</span>
            </div>
          ))}
        </div>
        <div className="p-3 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-gray-500 font-semibold mb-1">BANS</p>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded border ${i < 2 ? 'border-red-500/60 bg-red-500/20' : 'border-dark-border bg-dark-bg'}`} />
            ))}
          </div>
          <div className="w-px h-4 bg-dark-border" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded border ${i < 3 ? 'border-red-500/60 bg-red-500/20' : 'border-dark-border bg-dark-bg'}`} />
            ))}
          </div>
          <div className="mt-2 px-3 py-1 rounded bg-accent-blue/20 border border-accent-blue/40 text-xs text-accent-blue font-semibold animate-pulse">
            À vous
          </div>
        </div>
        <div className="p-3 space-y-2 border-l border-dark-border">
          <p className="text-xs text-red-400 font-bold mb-2 text-center">RED</p>
          {red.map((role, i) => (
            <div key={role} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${filledRed.includes(i) ? 'bg-red-500/20 border border-red-500/40' : 'bg-dark-bg/60 border border-dark-border'}`}>
              <div className={`w-6 h-6 rounded ${filledRed.includes(i) ? 'bg-red-500/40' : 'bg-dark-border'}`} />
              <span className={filledRed.includes(i) ? 'text-white' : 'text-gray-600'}>{role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const Home = () => {
  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/8 via-transparent to-accent-blue/4" />
        {/* Grille déco — couleur accent adaptative */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgb(var(--color-accent)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-accent)) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 container mx-auto max-w-6xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Texte gauche */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-blue/30 bg-accent-blue/10 text-accent-blue text-sm font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                Outil de préparation compétitive LoL
              </div>

              {/* Titre principal Void.pro */}
              <h1
                className="font-display font-bold leading-none mb-4 bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent"
                style={{ fontSize: 'clamp(4.5rem, 12vw, 8rem)' }}
              >
                Void.pro
              </h1>

              {/* Tagline */}
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-accent-blue via-white to-white bg-clip-text text-transparent">
                  Dominez les statistiques
                </span>
                <br />
                <span className="text-white">de votre équipe</span>
              </h2>

              <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-lg">
                Simulateur de draft, stats pro toutes ligues, suivi de roster et analyse de matchs —
                tout ce qu'il faut pour préparer et performer en compétitif.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/draft"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent-blue text-white rounded-xl text-base font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue"
                >
                  Essayer le Draft Simulator
                  <ChevronRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-dark-card border border-dark-border text-white rounded-xl text-base font-semibold hover:border-accent-blue/50 transition-all"
                >
                  Créer mon équipe
                </Link>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                Draft simulator accessible sans compte · Inscription gratuite
              </p>
            </motion.div>

            {/* Aperçu visuel droite */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <DraftPreview />
              <p className="text-center text-xs text-gray-600 mt-3">Aperçu du Draft Simulator</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── DOMINEZ LA DRAFT ─────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border bg-dark-card/30">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-accent-blue via-white to-accent-gold bg-clip-text text-transparent">
                Dominez la draft
              </span>
              <br />
              <span className="text-white">avant le game</span>
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              Prenez de l'avance sur vos adversaires avec des données pro et un simulateur complet.
            </p>
            <Link
              to="/draft"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent-blue text-white rounded-xl text-base font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue"
            >
              Lancer le Draft Simulator
              <ChevronRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── POUR QUI ─────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Fait pour les équipes compétitives</h2>
            <p className="text-gray-500">Du roster amateur au staff professionnel</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FOR_WHO.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-dark-card border border-dark-border text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
                    <Icon size={22} className="text-accent-blue" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-dark-card/40 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Toutes les fonctionnalités</h2>
            <p className="text-gray-500">Un outil complet, pas un dashboard de plus</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              const isGold = f.color === 'gold'
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="p-6 rounded-2xl bg-dark-card border border-dark-border hover:border-accent-blue/40 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isGold ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-accent-blue/10 border border-accent-blue/20'}`}>
                    <Icon size={20} className={isGold ? 'text-accent-gold' : 'text-accent-blue'} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Comment démarrer</h2>
            <p className="text-gray-500">Opérationnel en moins de 5 minutes</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-dark-border to-transparent" />
                )}
                <div className="font-display text-4xl font-bold text-accent-blue/20 mb-3">{step.num}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-dark-card border-t border-dark-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Prêt à prendre l'avance ?
          </h2>
          <p className="text-gray-500 mb-8">
            Gratuit, sans carte bancaire. Commence par le draft simulator ou crée ton équipe directement.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent-gold text-dark-bg rounded-xl text-base font-semibold hover:bg-accent-gold/90 transition-all hover:scale-105 glow-gold"
            >
              Créer mon compte gratuitement
              <ChevronRight size={18} />
            </Link>
            <Link
              to="/draft"
              className="inline-flex items-center gap-2 px-8 py-4 bg-dark-bg border border-dark-border text-white rounded-xl text-base font-semibold hover:border-accent-blue/40 transition-all"
            >
              Tester le draft d'abord
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
