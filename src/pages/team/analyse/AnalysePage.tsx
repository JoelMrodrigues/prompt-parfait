/**
 * Page d'entrée Analyse — SoloQ ou Team
 * Split-screen plein écran, style menu jeu vidéo.
 * Splash art champion · Gros titre centré · Contenu révélé au hover.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Lock } from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'

// ─── Assets ──────────────────────────────────────────────────────────────────

const SPLASH = {
  soloq: '/resources/bigchampions/jinx.jpg',
  team:  '/resources/bigchampions/orianna.jpg',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PanelConfig {
  side:        'left' | 'right'
  title:       string
  sub:         string
  description: string
  tags:        string[]
  splash:      string
  href?:       string
  disabled?:   boolean
  accent:      string
  accentDim:   string
  btnBg:       string
  overlayFrom: string
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function Panel({ side, title, sub, description, tags, splash, href, disabled, accent, accentDim, btnBg, overlayFrom }: PanelConfig) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -60 : 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: side === 'left' ? 0 : 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => !disabled && href && navigate(href)}
      className="relative flex-1 overflow-hidden flex flex-col"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {/* ── Splash art ── */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${splash})` }}
        animate={{ scale: hovered ? 1.06 : 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      {/* ── Overlay bas (gradient fort pour lisibilité) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to top,
          ${overlayFrom} 0%,
          ${overlayFrom}ee 25%,
          ${overlayFrom}99 55%,
          ${overlayFrom}33 80%,
          transparent 100%
        )`,
      }} />

      {/* ── Overlay côté (fondu vers le séparateur) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: side === 'left'
          ? `linear-gradient(to right, ${overlayFrom}22 55%, ${overlayFrom}ff 100%)`
          : `linear-gradient(to left,  ${overlayFrom}22 55%, ${overlayFrom}ff 100%)`,
      }} />

      {/* ── Overlay global sombre au hover ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* ── Contenu ── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Zone titre — toujours visible, centrée verticalement */}
        <div className="flex-1 flex flex-col justify-center px-14">
          {/* Label */}
          <motion.p
            animate={{ opacity: hovered ? 0 : 0.65, y: hovered ? -6 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs font-bold tracking-[0.3em] uppercase mb-5 select-none"
            style={{ color: accent }}
          >
            {sub}
          </motion.p>

          {/* Titre principal */}
          <motion.h2
            animate={{ y: hovered ? -16 : 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display font-black select-none leading-none"
            style={{
              fontSize: 'clamp(4.5rem, 7vw, 8rem)',
              color: '#ffffff',
              textShadow: `0 2px 40px rgba(0,0,0,0.8), 0 0 80px ${accentDim}`,
            }}
          >
            {title}
          </motion.h2>

          {/* Trait accent */}
          <motion.div
            animate={{ width: hovered ? '80px' : '48px', opacity: hovered ? 0 : 1 }}
            transition={{ duration: 0.35 }}
            className="h-0.5 mt-5 rounded-full"
            style={{ background: accent }}
          />
        </div>

        {/* Zone infos — révélée au hover depuis le bas */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 30 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="px-14 pb-14 shrink-0"
        >
          {/* Sub label visible dans la zone basse */}
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase mb-4 select-none"
            style={{ color: accent }}
          >
            {sub}
          </p>

          {/* Description */}
          <p className="text-white/75 text-sm leading-relaxed max-w-xs mb-7 select-none">
            {description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-3 py-1 rounded-full select-none"
                style={{
                  background: `${accentDim}22`,
                  border: `1px solid ${accentDim}55`,
                  color: accent,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          {disabled ? (
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm select-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}
            >
              <Lock size={14} />
              Bientôt disponible
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white cursor-pointer select-none"
              style={{ background: btnBg }}
              onClick={(e) => { e.stopPropagation(); href && navigate(href) }}
            >
              Accéder
              <ArrowRight size={15} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Séparateur central ───────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="relative w-px shrink-0 z-20 self-stretch">
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(96,165,250,0.6) 35%, rgba(167,139,250,0.6) 65%, transparent 100%)',
        }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 10, height: 10,
          background: 'rgba(167,139,250,0.9)',
          boxShadow: '0 0 20px 6px rgba(139,92,246,0.35)',
        }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AnalysePage = () => {
  const { isDark } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  // Désactive le scroll du main parent uniquement sur cette page
  useEffect(() => {
    let el = containerRef.current?.parentElement
    while (el) {
      const style = window.getComputedStyle(el)
      if (style.overflowY === 'auto' || style.overflow === 'auto') {
        el.style.overflowY = 'hidden'
        const captured = el
        return () => { captured.style.overflowY = '' }
      }
      el = el.parentElement
    }
  }, [])

  const overlayBlue   = isDark ? '#04101f' : '#e8f0fe'
  const overlayViolet = isDark ? '#08041a' : '#ede8fe'

  return (
    <div
      ref={containerRef}
      className="-m-6 flex overflow-hidden"
      style={{ height: 'calc(100vh - 5rem)' }}
    >
      <Panel
        side="left"
        title="Solo Queue"
        sub="Analyse individuelle"
        description="Identifiez les forces et faiblesses d'un joueur à partir de ses vraies stats. Rapport de coaching complet avec axes d'amélioration concrets."
        tags={['KDA', 'CS / min', 'Gold / min', 'Consistance', 'Vision', 'Champion pool']}
        splash={SPLASH.soloq}
        href="/team/analyse/soloq"
        accent="#60a5fa"
        accentDim="#3b82f6"
        btnBg="#2563eb"
        overlayFrom={overlayBlue}
      />

      <Divider />

      <Panel
        side="right"
        title="Équipe"
        sub="Analyse collective"
        description="Analysez les performances collectives sur les matchs officiels. Synergies, objectifs, early game et rapport d'équipe complet."
        tags={['Objectifs', 'Draft', 'Early game', 'Synergies', 'Timeline', 'Blocs']}
        splash={SPLASH.team}
        disabled
        accent="#a78bfa"
        accentDim="#8b5cf6"
        btnBg="#7c3aed"
        overlayFrom={overlayViolet}
      />
    </div>
  )
}
