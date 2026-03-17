/**
 * Page d'accueil — Void.pro
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Swords, BarChart3, Users, Upload, Trophy, RefreshCw,
  ChevronRight, Shield, Target, TrendingUp,
} from 'lucide-react'

// ─── Données ──────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Swords,    title: 'Draft Simulator',        description: 'Prépare tes picks/bans en conditions réelles. Mode tournoi, phases de ban, historique des drafts sauvegardé.',                          color: 'blue' },
  { icon: BarChart3, title: 'Stats Pro (toutes ligues)', description: 'Winrate, pickrate, banrate de chaque champion dans toutes les ligues pro. Filtré par patch, split et région.',                       color: 'gold' },
  { icon: Users,     title: 'Gestion d\'équipe',       description: 'Suivi du rang, des champions favoris et de la forme de chaque joueur. Vue roster complète en temps réel.',                            color: 'blue' },
  { icon: Upload,    title: 'Analyse de matchs',       description: 'Importe tes matchs et visualise la timeline, les avantages CS/or et les décisions clés de chaque partie.',                           color: 'gold' },
  { icon: Trophy,    title: 'Pool de Champions',       description: 'Classe les champions de chaque joueur par niveau de maîtrise (S/A/B/C). Visualise les options disponibles avant de drafter.',        color: 'blue' },
  { icon: RefreshCw, title: 'Sync Riot automatique',   description: 'Rang, parties jouées et top champions mis à jour en continu depuis l\'API Riot. Zéro saisie manuelle.',                              color: 'gold' },
]

const FOR_WHO = [
  { icon: Shield,     title: 'Coachs & Analystes',    description: 'Prépare les drafts, analyse les matchs et identifie les points faibles de l\'équipe adverse.' },
  { icon: Target,     title: 'Équipes compétitives',  description: 'Du semi-pro à l\'amateur — suis les performances de ton roster et structure tes sessions.' },
  { icon: TrendingUp, title: 'Team Managers',         description: 'Vue d\'ensemble du roster, suivi de la forme et gestion des pools de champions par joueur.' },
]

const STEPS = [
  { num: '01', title: 'Crée ton équipe',     desc: 'Ajoute tes joueurs et synchronise leurs comptes Riot en quelques secondes.' },
  { num: '02', title: 'Importe tes matchs',  desc: 'Upload tes parties et laisse l\'app analyser timelines et statistiques.' },
  { num: '03', title: 'Prépare tes drafts',  desc: 'Utilise les stats pro et le profil de tes joueurs pour drafter efficacement.' },
]

// ─── Décor animé (constantes fixes — pas de Math.random en render) ─────────────

const ORBS = [
  { top: '5%',  left: '58%', size: 520, color: 'rgba(147,51,234,0.07)',  blur: 130, duration: 14, dx: 40,  dy: 25  },
  { top: '42%', left: '72%', size: 380, color: 'rgba(168,85,247,0.05)', blur: 100, duration: 18, dx: -28, dy: 38  },
  { top: '68%', left: '18%', size: 320, color: 'rgba(147,51,234,0.04)', blur: 90,  duration: 12, dx: 22,  dy: -18 },
]

const PARTICLES: { x: number; y: number; s: number; dur: number; del: number; dy: number }[] = [
  { x: 8,  y: 15, s: 2.5, dur: 8,  del: 0,   dy: 20 },
  { x: 20, y: 42, s: 3,   dur: 11, del: 1.5, dy: 28 },
  { x: 33, y: 68, s: 1.5, dur: 9,  del: 0.5, dy: 18 },
  { x: 50, y: 22, s: 2,   dur: 13, del: 2,   dy: 22 },
  { x: 63, y: 55, s: 2.5, dur: 8,  del: 3,   dy: 15 },
  { x: 76, y: 32, s: 3,   dur: 10, del: 1,   dy: 25 },
  { x: 88, y: 74, s: 1,   dur: 12, del: 2.5, dy: 20 },
  { x: 15, y: 82, s: 2,   dur: 9,  del: 0.8, dy: 22 },
  { x: 44, y: 12, s: 2.5, dur: 11, del: 3.5, dy: 18 },
  { x: 57, y: 88, s: 1.5, dur: 8,  del: 1.2, dy: 24 },
  { x: 71, y: 60, s: 3,   dur: 14, del: 0.3, dy: 20 },
  { x: 84, y: 44, s: 2,   dur: 10, del: 2.8, dy: 16 },
  { x: 28, y: 30, s: 1.5, dur: 9,  del: 1.8, dy: 20 },
  { x: 92, y: 20, s: 2,   dur: 11, del: 0.6, dy: 22 },
  { x: 6,  y: 55, s: 3,   dur: 7,  del: 2.2, dy: 18 },
]

// ─── Composant background ─────────────────────────────────────────────────────

function FloatingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grille */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgb(var(--color-accent)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-accent)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Orbes flottants */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            filter: `blur(${orb.blur}px)`,
            marginLeft: -orb.size / 2,
            marginTop: -orb.size / 2,
          }}
          animate={{ x: [0, orb.dx, 0], y: [0, orb.dy, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Micro-particules */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-accent-blue/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s }}
          animate={{ y: [-p.dy / 2, p.dy / 2, -p.dy / 2], opacity: [0.1, 0.55, 0.1] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Draft Preview animée ──────────────────────────────────────────────────────

const DRAFT_STEPS = [
  { blue: 0, red: 0 },
  { blue: 1, red: 0 },
  { blue: 1, red: 1 },
  { blue: 2, red: 1 },
  { blue: 2, red: 2 },
  { blue: 3, red: 2 },
]

function DraftPreview() {
  const [stepIdx, setStepIdx] = useState(5)

  useEffect(() => {
    let cancelled = false

    function tick(idx: number) {
      if (cancelled) return
      setStepIdx(idx)
      if (idx < DRAFT_STEPS.length - 1) {
        setTimeout(() => tick(idx + 1), 950)
      } else {
        setTimeout(() => {
          if (cancelled) return
          setStepIdx(0)
          setTimeout(() => tick(1), 700)
        }, 3000)
      }
    }

    const init = setTimeout(() => tick(1), 2200)
    return () => { cancelled = true; clearTimeout(init) }
  }, [])

  const state = DRAFT_STEPS[Math.min(stepIdx, DRAFT_STEPS.length - 1)]
  const roles = ['Top', 'Jungle', 'Mid', 'Bot', 'Sup']

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
        {/* Blue side */}
        <div className="p-3 space-y-2 border-r border-dark-border">
          <p className="text-xs text-accent-blue font-bold mb-2 text-center">BLUE</p>
          {roles.map((role, i) => {
            const filled = i < state.blue
            const isNext = i === state.blue && state.blue < roles.length
            return (
              <motion.div
                key={role}
                animate={
                  filled
                    ? { backgroundColor: 'rgba(147,51,234,0.18)', borderColor: 'rgba(147,51,234,0.45)' }
                    : isNext
                    ? { borderColor: ['rgba(147,51,234,0.15)', 'rgba(147,51,234,0.55)', 'rgba(147,51,234,0.15)'] }
                    : { backgroundColor: 'rgba(10,10,15,0.6)', borderColor: 'rgba(42,37,53,1)' }
                }
                transition={
                  filled ? { duration: 0.3 } :
                  isNext  ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } :
                  { duration: 0.3 }
                }
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs border"
              >
                <motion.div
                  animate={filled ? { backgroundColor: 'rgba(147,51,234,0.45)' } : { backgroundColor: 'rgba(42,37,53,1)' }}
                  initial={false}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6 rounded shrink-0"
                />
                <span className={filled ? 'text-white' : 'text-gray-600'}>{role}</span>
              </motion.div>
            )
          })}
        </div>

        {/* Centre bans */}
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

        {/* Red side */}
        <div className="p-3 space-y-2 border-l border-dark-border">
          <p className="text-xs text-red-400 font-bold mb-2 text-center">RED</p>
          {roles.map((role, i) => {
            const filled = i < state.red
            const isNext = i === state.red && state.red < roles.length
            return (
              <motion.div
                key={role}
                animate={
                  filled
                    ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.38)' }
                    : isNext
                    ? { borderColor: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.48)', 'rgba(239,68,68,0.12)'] }
                    : { backgroundColor: 'rgba(10,10,15,0.6)', borderColor: 'rgba(42,37,53,1)' }
                }
                transition={
                  filled ? { duration: 0.3 } :
                  isNext  ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } :
                  { duration: 0.3 }
                }
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs border"
              >
                <motion.div
                  animate={filled ? { backgroundColor: 'rgba(239,68,68,0.35)' } : { backgroundColor: 'rgba(42,37,53,1)' }}
                  initial={false}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6 rounded shrink-0"
                />
                <span className={filled ? 'text-white' : 'text-gray-600'}>{role}</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Variants d'animation ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Home = () => {
  return (
    <div className="min-h-screen">

      {/* ─── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20">
        <FloatingBackground />

        <div className="relative z-10 container mx-auto max-w-6xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Texte gauche */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-blue/30 bg-accent-blue/10 text-accent-blue text-sm font-medium mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                Outil de préparation compétitive LoL
              </motion.div>

              {/* Titre Void.pro avec glow pulsé */}
              <motion.h1
                className="font-display font-bold leading-none mb-4 bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent"
                style={{ fontSize: 'clamp(4.5rem, 12vw, 8rem)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: [
                    'drop-shadow(0 0 12px rgba(168,85,247,0.25))',
                    'drop-shadow(0 0 48px rgba(168,85,247,0.7))',
                    'drop-shadow(0 0 12px rgba(168,85,247,0.25))',
                  ],
                }}
                transition={{
                  opacity: { duration: 0.6 },
                  y: { duration: 0.6 },
                  filter: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
                }}
              >
                Void.pro
              </motion.h1>

              {/* Tagline — mots qui apparaissent en stagger */}
              <motion.h2
                className="font-display text-2xl md:text-3xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
              >
                <span className="bg-gradient-to-r from-accent-blue via-white to-white bg-clip-text text-transparent">
                  Dominez les statistiques
                </span>
                <br />
                <span className="text-white">de votre équipe</span>
              </motion.h2>

              <motion.p
                className="text-lg text-gray-400 mb-8 leading-relaxed max-w-lg"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.38 }}
              >
                Simulateur de draft, stats pro toutes ligues, suivi de roster et analyse de matchs —
                tout ce qu'il faut pour préparer et performer en compétitif.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
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
              </motion.div>

              <motion.p
                className="text-sm text-gray-600 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                Draft simulator accessible sans compte · Inscription gratuite
              </motion.p>
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

      {/* ─── DOMINEZ LA DRAFT ───────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border bg-dark-card/30">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
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

      {/* ─── POUR QUI ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Fait pour les équipes compétitives</h2>
            <p className="text-gray-500">Du roster amateur au staff professionnel</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {FOR_WHO.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl bg-dark-card border border-dark-border text-center cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
                    <Icon size={22} className="text-accent-blue" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-dark-card/40 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Toutes les fonctionnalités</h2>
            <p className="text-gray-500">Un outil complet, pas un dashboard de plus</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon
              const isGold = f.color === 'gold'
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="p-6 rounded-2xl bg-dark-card border border-dark-border hover:border-accent-blue/40 transition-colors group cursor-default"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isGold ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-accent-blue/10 border border-accent-blue/20'}`}>
                    <Icon size={20} className={isGold ? 'text-accent-gold' : 'text-accent-blue'} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE ──────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-white mb-3">Comment démarrer</h2>
            <p className="text-gray-500">Opérationnel en moins de 5 minutes</p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                className="relative text-center"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-dark-border to-transparent" />
                )}
                <motion.div
                  className="font-display text-4xl font-bold text-accent-blue/20 mb-3"
                  whileInView={{ opacity: [0, 1], scale: [0.8, 1] }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                  viewport={{ once: true }}
                >
                  {step.num}
                </motion.div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-dark-card border-t border-dark-border">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
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
