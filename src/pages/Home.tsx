/**
 * Page d'accueil — Void.pro  (v2 — full animations)
 */
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
} from 'framer-motion'
import {
  Swords, BarChart3, Users, Upload, Trophy, RefreshCw,
  ChevronRight, Shield, Target, TrendingUp, Zap,
} from 'lucide-react'

// ─── DATA ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Swords,    title: 'Draft Simulator',          description: 'Simule picks/bans en conditions réelles. Phases de ban, historique sauvegardé.',              color: 'blue' },
  { icon: BarChart3, title: 'Stats Pro (toutes ligues)', description: 'Winrate, pickrate, banrate de chaque champion filtré par patch, split et région.',              color: 'gold' },
  { icon: Users,     title: 'Gestion d\'équipe',         description: 'Suivi du rang, champions favoris et de la forme de chaque joueur en temps réel.',              color: 'blue' },
  { icon: Upload,    title: 'Analyse de matchs',         description: 'Importe tes matchs et visualise la timeline, les avantages CS/or et décisions clés.',          color: 'gold' },
  { icon: Trophy,    title: 'Pool de Champions',         description: 'Classe les champions par niveau de maîtrise (S/A/B/C). Visualise les options avant de drafter.', color: 'blue' },
  { icon: RefreshCw, title: 'Sync Riot automatique',     description: 'Rang, parties jouées et top champions mis à jour en continu depuis l\'API Riot.',              color: 'gold' },
]

const FOR_WHO = [
  { icon: Shield,     title: 'Coachs & Analystes',    description: 'Prépare les drafts, analyse les matchs et identifie les points faibles adverses.' },
  { icon: Target,     title: 'Équipes compétitives',  description: 'Du semi-pro à l\'amateur — suis les performances de ton roster et structure tes sessions.' },
  { icon: TrendingUp, title: 'Team Managers',         description: 'Vue d\'ensemble du roster, suivi de la forme et gestion des pools par joueur.' },
]

const STEPS = [
  { num: '01', title: 'Crée ton équipe',    desc: 'Ajoute tes joueurs et synchronise leurs comptes Riot en quelques secondes.' },
  { num: '02', title: 'Importe tes matchs', desc: 'Upload tes parties et laisse l\'app analyser timelines et statistiques.' },
  { num: '03', title: 'Prépare tes drafts', desc: 'Utilise les stats pro et le profil de tes joueurs pour drafter efficacement.' },
]

// ─── MOCKS ────────────────────────────────────────────────────────────────────

const MOCK_PLAYERS = [
  { name: 'Kaïros',  pseudo: 'Kairosgg',  role: 'TOP',    rank: 'P1', rankColor: '#c084fc', mood: 0.85, wins: 8, games: 10 },
  { name: 'Vayne',   pseudo: 'VayneMid',  role: 'JUNGLE', rank: 'D2', rankColor: '#60a5fa', mood: 0.72, wins: 6, games: 9  },
  { name: 'Luxxie',  pseudo: 'LuxMid',    role: 'MID',    rank: 'P3', rankColor: '#c084fc', mood: 0.90, wins: 9, games: 10 },
  { name: 'aitlade', pseudo: 'aitlade',   role: 'BOT',    rank: 'D1', rankColor: '#60a5fa', mood: 0.68, wins: 7, games: 11 },
  { name: 'Thresh',  pseudo: 'ThreshSup', role: 'SUP',    rank: 'P2', rankColor: '#c084fc', mood: 0.78, wins: 7, games: 9  },
]

const MOCK_STATS = [
  { name: 'Jinx',    wr: 54, pr: 18, tier: 'S', color: '#60a5fa', trending: true  },
  { name: 'Orianna', wr: 51, pr: 22, tier: 'A', color: '#c084fc', trending: false },
  { name: 'Graves',  wr: 56, pr: 14, tier: 'S', color: '#34d399', trending: true  },
  { name: 'Riven',   wr: 47, pr: 11, tier: 'B', color: '#f87171', trending: false },
  { name: 'Thresh',  wr: 53, pr: 25, tier: 'A', color: '#fbbf24', trending: false },
]

const DRAFT_STEPS = [
  { blue: 0, red: 0 },
  { blue: 1, red: 0 },
  { blue: 1, red: 1 },
  { blue: 2, red: 1 },
  { blue: 2, red: 2 },
  { blue: 3, red: 2 },
]

// ─── DÉCOR ────────────────────────────────────────────────────────────────────

const ORBS = [
  { top: '5%',  left: '58%', size: 520, color: 'rgba(147,51,234,0.07)',  blur: 130, duration: 14, dx: 40,  dy: 25  },
  { top: '42%', left: '72%', size: 380, color: 'rgba(168,85,247,0.05)', blur: 100, duration: 18, dx: -28, dy: 38  },
  { top: '68%', left: '18%', size: 320, color: 'rgba(147,51,234,0.04)', blur: 90,  duration: 12, dx: 22,  dy: -18 },
]

const PARTICLES: { x: number; y: number; s: number; dur: number; del: number; dy: number }[] = [
  { x: 8,  y: 15, s: 2.5, dur: 8,  del: 0,   dy: 20 }, { x: 20, y: 42, s: 3,   dur: 11, del: 1.5, dy: 28 },
  { x: 33, y: 68, s: 1.5, dur: 9,  del: 0.5, dy: 18 }, { x: 50, y: 22, s: 2,   dur: 13, del: 2,   dy: 22 },
  { x: 63, y: 55, s: 2.5, dur: 8,  del: 3,   dy: 15 }, { x: 76, y: 32, s: 3,   dur: 10, del: 1,   dy: 25 },
  { x: 88, y: 74, s: 1,   dur: 12, del: 2.5, dy: 20 }, { x: 15, y: 82, s: 2,   dur: 9,  del: 0.8, dy: 22 },
  { x: 44, y: 12, s: 2.5, dur: 11, del: 3.5, dy: 18 }, { x: 57, y: 88, s: 1.5, dur: 8,  del: 1.2, dy: 24 },
  { x: 71, y: 60, s: 3,   dur: 14, del: 0.3, dy: 20 }, { x: 84, y: 44, s: 2,   dur: 10, del: 2.8, dy: 16 },
  { x: 28, y: 30, s: 1.5, dur: 9,  del: 1.8, dy: 20 }, { x: 92, y: 20, s: 2,   dur: 11, del: 0.6, dy: 22 },
  { x: 6,  y: 55, s: 3,   dur: 7,  del: 2.2, dy: 18 },
]

// ─── VARIANTS ─────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

// Entrées différentes pour chaque feature card
const CARD_ENTRANCES = [
  { hidden: { opacity: 0, x: -70, rotate: -4 },          show: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.65, ease: 'easeOut' } } },
  { hidden: { opacity: 0, y: -60, scale: 0.82 },          show: { opacity: 1, y: 0, scale: 1,  transition: { duration: 0.6,  ease: [0.34,1.56,0.64,1] } } },
  { hidden: { opacity: 0, x: 70, rotate: 4 },             show: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.65, ease: 'easeOut' } } },
  { hidden: { opacity: 0, scale: 0.6, rotate: -6 },       show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.7, ease: [0.34,1.56,0.64,1] } } },
  { hidden: { opacity: 0, y: 70, x: -40 },                show: { opacity: 1, y: 0, x: 0,      transition: { duration: 0.6,  ease: 'easeOut' } } },
  { hidden: { opacity: 0, y: 70, x: 40 },                 show: { opacity: 1, y: 0, x: 0,      transition: { duration: 0.6,  ease: 'easeOut' } } },
]

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────

function FloatingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgb(var(--color-accent)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-accent)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ top: orb.top, left: orb.left, width: orb.size, height: orb.size, background: orb.color, filter: `blur(${orb.blur}px)`, marginLeft: -orb.size / 2, marginTop: -orb.size / 2 }}
          animate={{ x: [0, orb.dx, 0], y: [0, orb.dy, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
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

// Compteur animé
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toString() + suffix)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) animate(count, to, { duration: 1.8, ease: 'easeOut' })
  }, [inView, count, to])

  return <motion.span ref={ref}>{rounded}</motion.span>
}

// 3D tilt au hover
function Tilt3D({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [7, -7])
  const rotateY = useTransform(x, [-0.5, 0.5], [-7, 7])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── TeamPreview ────────────────────────────────────────────────────────────────
function TeamPreview() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % MOCK_PLAYERS.length), 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-bg border-b border-dark-border">
        <span className="text-xs font-bold text-accent-blue">⚡ ÉQUIPE · S16</span>
        <div className="flex gap-1 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Live sync</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {MOCK_PLAYERS.map((p, i) => {
          const isActive = i === active
          return (
            <motion.div
              key={p.pseudo}
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: 1, x: 0,
                backgroundColor: isActive ? 'rgba(147,51,234,0.12)' : 'transparent',
                borderColor: isActive ? 'rgba(147,51,234,0.4)' : 'rgba(42,37,53,0.6)',
              }}
              transition={{ delay: i * 0.08, duration: 0.35, borderColor: { duration: 0.3 }, backgroundColor: { duration: 0.3 } }}
              className="flex items-center gap-3 rounded-xl px-3 py-2 border"
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: p.rankColor + '22', color: p.rankColor }}
              >
                {p.name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-600 truncate">{p.pseudo}</span>
                </div>
                {/* Mood bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-dark-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: p.mood > 0.75 ? '#34d399' : p.mood > 0.6 ? '#fbbf24' : '#f87171' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.mood * 100}%` }}
                      transition={{ delay: i * 0.1 + 0.4, duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{p.wins}/{p.games}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: p.rankColor + '22', color: p.rankColor }}>
                  {p.rank}
                </span>
                <span className="text-[10px] text-gray-600">{p.role}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── StatsPreview ───────────────────────────────────────────────────────────────
function StatsPreview() {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-bg border-b border-dark-border">
        <span className="text-xs font-bold text-accent-blue">📊 STATS PRO · Patch 14.24</span>
        <span className="text-[10px] text-gray-500">Toutes ligues</span>
      </div>

      {/* Légende */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-[1fr_60px_36px_32px] gap-2 text-[10px] text-gray-600 font-medium">
        <span>Champion</span>
        <span className="text-right">Winrate</span>
        <span className="text-right">PR%</span>
        <span className="text-center">Tier</span>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {MOCK_STATS.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            viewport={{ once: true }}
            className="grid grid-cols-[1fr_60px_36px_32px] gap-2 items-center"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: s.color + '22', color: s.color }}
              >
                {s.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">{s.name}</span>
                  {s.trending && <span className="text-[8px] text-green-400 font-bold">↑</span>}
                </div>
                {/* Barre winrate */}
                <div className="h-1 w-full rounded-full bg-dark-border overflow-hidden mt-0.5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${((s.wr - 40) / 20) * 100}%` }}
                    transition={{ delay: i * 0.12 + 0.2, duration: 0.8, ease: 'easeOut' }}
                    viewport={{ once: true }}
                  />
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-right" style={{ color: s.wr >= 53 ? '#34d399' : s.wr >= 50 ? '#fbbf24' : '#f87171' }}>
              {s.wr}%
            </span>
            <span className="text-xs text-gray-500 text-right">{s.pr}%</span>
            <span className="text-[10px] font-bold text-center px-1.5 py-0.5 rounded"
              style={{ backgroundColor: s.tier === 'S' ? '#34d39922' : s.tier === 'A' ? '#c084fc22' : '#fbbf2422', color: s.tier === 'S' ? '#34d399' : s.tier === 'A' ? '#c084fc' : '#fbbf24' }}
            >
              {s.tier}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── DraftPreview ───────────────────────────────────────────────────────────────
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
    <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-dark-bg border-b border-dark-border">
        <span className="text-xs font-bold text-accent-blue">⚔️ DRAFT · PHASE 3 — PICKS</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
      </div>
      <div className="grid grid-cols-3">
        <div className="p-3 space-y-2 border-r border-dark-border">
          <p className="text-xs text-accent-blue font-bold text-center mb-2">BLUE</p>
          {roles.map((role, i) => {
            const filled = i < state.blue
            const isNext = i === state.blue && state.blue < roles.length
            return (
              <motion.div key={role}
                animate={filled ? { backgroundColor: 'rgba(147,51,234,0.18)', borderColor: 'rgba(147,51,234,0.45)' } : isNext ? { borderColor: ['rgba(147,51,234,0.15)', 'rgba(147,51,234,0.6)', 'rgba(147,51,234,0.15)'] } : { backgroundColor: 'rgba(10,10,15,0.6)', borderColor: 'rgba(42,37,53,1)' }}
                transition={filled ? { duration: 0.3 } : isNext ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs border"
              >
                <motion.div animate={filled ? { backgroundColor: 'rgba(147,51,234,0.45)' } : { backgroundColor: 'rgba(42,37,53,1)' }} initial={false} transition={{ duration: 0.3 }} className="w-6 h-6 rounded shrink-0" />
                <span className={filled ? 'text-white' : 'text-gray-600'}>{role}</span>
              </motion.div>
            )
          })}
        </div>
        <div className="p-3 flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-gray-500 font-semibold mb-1">BANS</p>
          <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className={`w-6 h-6 rounded border ${i < 2 ? 'border-red-500/60 bg-red-500/20' : 'border-dark-border bg-dark-bg'}`} />)}</div>
          <div className="w-px h-4 bg-dark-border" />
          <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className={`w-6 h-6 rounded border ${i < 3 ? 'border-red-500/60 bg-red-500/20' : 'border-dark-border bg-dark-bg'}`} />)}</div>
          <div className="mt-2 px-3 py-1 rounded bg-accent-blue/20 border border-accent-blue/40 text-xs text-accent-blue font-semibold animate-pulse">À vous</div>
        </div>
        <div className="p-3 space-y-2 border-l border-dark-border">
          <p className="text-xs text-red-400 font-bold text-center mb-2">RED</p>
          {roles.map((role, i) => {
            const filled = i < state.red
            const isNext = i === state.red && state.red < roles.length
            return (
              <motion.div key={role}
                animate={filled ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.38)' } : isNext ? { borderColor: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.5)', 'rgba(239,68,68,0.12)'] } : { backgroundColor: 'rgba(10,10,15,0.6)', borderColor: 'rgba(42,37,53,1)' }}
                transition={filled ? { duration: 0.3 } : isNext ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs border"
              >
                <motion.div animate={filled ? { backgroundColor: 'rgba(239,68,68,0.35)' } : { backgroundColor: 'rgba(42,37,53,1)' }} initial={false} transition={{ duration: 0.3 }} className="w-6 h-6 rounded shrink-0" />
                <span className={filled ? 'text-white' : 'text-gray-600'}>{role}</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export const Home = () => {
  return (
    <div className="min-h-screen">

      {/* ════════════════════════════════════════════════════════════════
          HERO — plein écran centré
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 text-center">
        <FloatingBackground />

        <div className="relative z-10 container mx-auto max-w-4xl px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-blue/30 bg-accent-blue/10 text-accent-blue text-sm font-medium mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            Outil de préparation compétitive League of Legends
          </motion.div>

          <motion.h1
            className="font-display font-bold leading-none mb-6 bg-gradient-to-r from-purple-300 via-white to-purple-200 bg-clip-text text-transparent"
            style={{ fontSize: 'clamp(5rem, 14vw, 9.5rem)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1, y: 0,
              filter: [
                'drop-shadow(0 0 12px rgba(168,85,247,0.2))',
                'drop-shadow(0 0 55px rgba(168,85,247,0.75))',
                'drop-shadow(0 0 12px rgba(168,85,247,0.2))',
              ],
            }}
            transition={{
              opacity: { duration: 0.7 },
              y: { duration: 0.7 },
              filter: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 },
            }}
          >
            Void.pro
          </motion.h1>

          <motion.h2
            className="font-display text-2xl md:text-3xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="bg-gradient-to-r from-accent-blue via-white to-white bg-clip-text text-transparent">
              Dominez les statistiques
            </span>{' '}
            <span className="text-white">de votre équipe</span>
          </motion.h2>

          <motion.p
            className="text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42 }}
          >
            Simulateur de draft, stats pro toutes ligues, suivi de roster et analyse de matchs.
            Tout ce qu'il faut pour performer en compétitif.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.56 }}
          >
            <Link to="/draft" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent-blue text-white rounded-xl text-base font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue">
              Essayer le Draft Simulator <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-7 py-3.5 bg-dark-card border border-dark-border text-white rounded-xl text-base font-semibold hover:border-accent-blue/50 transition-all">
              Créer mon équipe
            </Link>
          </motion.div>

          <motion.p
            className="text-sm text-gray-600 mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            Draft simulator accessible sans compte · Inscription gratuite
          </motion.p>
        </div>

        {/* Flèche scroll */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronRight size={20} className="text-gray-600 rotate-90" />
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          COMPTEURS
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-14 px-6 border-t border-dark-border bg-dark-card/40">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="container mx-auto max-w-4xl grid grid-cols-3 gap-6 text-center"
        >
          {[
            { value: 6,   suffix: '',   label: 'features complètes',       icon: <Zap size={18} /> },
            { value: 200, suffix: '+',  label: 'matchs analysables',        icon: <BarChart3 size={18} /> },
            { value: 12,  suffix: '',   label: 'stats trackées par joueur', icon: <Users size={18} /> },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="flex flex-col items-center gap-1">
              <div className="text-accent-blue mb-2 opacity-70">{s.icon}</div>
              <div className="font-display text-4xl md:text-5xl font-bold text-white">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — ÉQUIPE (texte gauche, preview droite)
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-dark-border bg-dark-card text-gray-400 text-xs font-medium mb-5">
              <Users size={12} className="text-accent-blue" /> Gestion de roster
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Gérez votre{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-accent-blue to-purple-300 bg-clip-text text-transparent">équipe</span>
                <motion.span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-blue to-purple-400 block"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  viewport={{ once: true }}
                />
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Suivez la forme, le rang et les champions favoris de chaque joueur en temps réel.
              La synchronisation Riot se fait automatiquement — aucune saisie manuelle.
            </p>
            <ul className="space-y-2 mb-8">
              {['Mood score basé sur les 5 dernières parties', 'Rang et LP synchronisés en continu', 'Pool de champions avec niveaux de maîtrise'].map((txt) => (
                <li key={txt} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />
                  {txt}
                </li>
              ))}
            </ul>
            <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent-blue/40 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/10 transition-all">
              Créer mon équipe <ChevronRight size={15} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60, transformPerspective: 1200, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <TeamPreview />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — STATS PRO (preview gauche, texte droite)
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-dark-card/30 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60, transformPerspective: 1200, rotateY: 10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <StatsPreview />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-dark-border bg-dark-card text-gray-400 text-xs font-medium mb-5">
              <BarChart3 size={12} className="text-accent-gold" /> Stats pro
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Toutes les{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-accent-gold to-yellow-200 bg-clip-text text-transparent">stats pro</span>
                <motion.span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-gold to-yellow-300 block"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  viewport={{ once: true }}
                />
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Winrate, pickrate et banrate de chaque champion dans toutes les ligues pro.
              Filtrez par patch, split et région pour préparer vos drafts avec des données précises.
            </p>
            <ul className="space-y-2 mb-8">
              {['Toutes les ligues majeures (LEC, LCK, LPL…)', 'Filtres par patch et split', 'Tier list mise à jour en temps réel'].map((txt) => (
                <li key={txt} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-gold shrink-0" />
                  {txt}
                </li>
              ))}
            </ul>
            <Link to="/stats" className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent-gold/40 text-accent-gold rounded-lg text-sm hover:bg-accent-gold/10 transition-all">
              Explorer les stats <ChevronRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 — DRAFT (texte gauche, preview droite)
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-dark-border bg-dark-card text-gray-400 text-xs font-medium mb-5">
              <Swords size={12} className="text-accent-blue" /> Draft Simulator
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Dominez{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-accent-blue to-purple-300 bg-clip-text text-transparent">la draft</span>
                <motion.span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-blue to-purple-400 block"
                  initial={{ scaleX: 0, originX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                  viewport={{ once: true }}
                />
              </span>
              {' '}avant le game
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              Simulez vos drafts en conditions réelles avec phases de ban, auto-save debounced
              et historique complet. Accessible sans compte.
            </p>
            <ul className="space-y-2 mb-8">
              {['Phases de ban + picks alternés réalistes', 'Auto-save toutes les 800ms', 'Accessible sans compte'].map((txt) => (
                <li key={txt} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0" />
                  {txt}
                </li>
              ))}
            </ul>
            <Link to="/draft" className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue">
              Lancer le simulateur <ChevronRight size={15} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60, transformPerspective: 1200, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            viewport={{ once: true }}
          >
            <DraftPreview />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FEATURES GRID — entrées uniques + Tilt3D hover
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-dark-card/40 border-t border-dark-border">
        <div className="container mx-auto max-w-6xl">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500">Un outil complet, pas un dashboard de plus</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              const isGold = f.color === 'gold'
              const entrance = CARD_ENTRANCES[i]
              return (
                <motion.div
                  key={f.title}
                  variants={entrance}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                >
                  <Tilt3D className="h-full">
                    <div className={`h-full p-6 rounded-2xl bg-dark-card border transition-colors hover:border-accent-blue/30 cursor-default ${isGold ? 'border-dark-border' : 'border-dark-border'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${isGold ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-accent-blue/10 border border-accent-blue/20'}`}>
                        <Icon size={20} className={isGold ? 'text-accent-gold' : 'text-accent-blue'} />
                      </div>
                      <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                    </div>
                  </Tilt3D>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          POUR QUI — flip entrance 3D
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-dark-border">
        <div className="container mx-auto max-w-5xl">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white mb-3">Fait pour les équipes compétitives</h2>
            <p className="text-gray-500">Du roster amateur au staff professionnel</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FOR_WHO.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, rotateY: 90, transformPerspective: 1000 }}
                  whileInView={{ opacity: 1, rotateY: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.18, ease: 'easeOut' }}
                  viewport={{ once: true }}
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
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          COMMENT ÇA MARCHE — ligne animée + steps
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-dark-card/30 border-t border-dark-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-white mb-3">Comment démarrer</h2>
            <p className="text-gray-500">Opérationnel en moins de 5 minutes</p>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Ligne de connexion */}
            <div className="hidden md:block absolute top-7 left-[18%] right-[18%] h-px overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-blue/0 via-accent-blue/50 to-accent-blue/0"
                initial={{ scaleX: 0, originX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                viewport={{ once: true }}
              />
            </div>

            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: i * 0.18, ease: 'easeOut' }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-dark-card border border-accent-blue/30 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-lg font-bold text-accent-blue">{step.num}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          CTA FINAL — glowing border animé
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 border-t border-dark-border relative overflow-hidden">
        {/* Glow central */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(147,51,234,0.12), transparent)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative z-10 text-center max-w-2xl mx-auto"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5">
            Prêt à prendre l'avance ?
          </h2>
          <p className="text-gray-500 mb-10 text-lg">
            Gratuit, sans carte bancaire. Commence par le draft simulator ou crée ton équipe directement.
          </p>

          {/* Bouton avec glow pulsé */}
          <div className="flex flex-wrap gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent-gold text-dark-bg rounded-xl text-base font-semibold transition-all glow-gold"
              >
                Créer mon compte gratuitement <ChevronRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/draft"
                className="inline-flex items-center gap-2 px-8 py-4 bg-dark-bg border border-dark-border text-white rounded-xl text-base font-semibold hover:border-accent-blue/40 transition-all"
              >
                Tester le draft d'abord
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
