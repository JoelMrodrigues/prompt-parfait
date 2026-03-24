/**
 * AvatarPickerModal — choisir un avatar parmi champions, rangs, runes ou upload perso
 */
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Upload, Loader2, Search } from 'lucide-react'

// ─── Données statiques ────────────────────────────────────────────────────────

const CHAMPIONS = [
  'aatrox','ahri','akali','akshan','alistar','ambessa','amumu','anivia','annie','aphelios',
  'ashe','aurelionsol','aurora','azir','bard','belveth','blitzcrank','brand','braum','briar',
  'caitlyn','camille','cassiopeia','chogath','corki','darius','diana','draven','drmundo','ekko',
  'elise','evelynn','ezreal','fiddlesticks','fiora','fizz','galio','gangplank','garen','gnar',
  'gragas','graves','gwen','hecarim','heimerdinger','hwei','illaoi','irelia','ivern','janna',
  'jarvaniv','jax','jayce','jhin','jinx','kaisa','kalista','karma','karthus','kassadin',
  'katarina','kayle','kayn','kennen','khazix','kindred','kled','kogmaw','ksante','leblanc',
  'leesin','leona','lillia','lissandra','lucian','lulu','lux','malphite','malzahar','maokai',
  'masteryi','mel','milio','missfortune','mordekaiser','morgana','naafiri','nami','nasus',
  'nautilus','neeko','nidalee','nilah','nocturne','nunu','olaf','orianna','ornn','pantheon',
  'poppy','pyke','qiyana','quinn','rakan','rammus','reksai','rell','renata','renekton',
  'rengar','riven','rumble','ryze','samira','sejuani','senna','seraphine','sett','shaco',
  'shen','shyvana','singed','sion','sivir','skarner','smolder','sona','soraka','swain',
  'sylas','syndra','tahmkench','taliyah','talon','taric','teemo','thresh','tristana','trundle',
  'tryndamere','twistedfate','twitch','udyr','urgot','varus','vayne','veigar','velkoz','vex',
  'vi','viego','viktor','vladimir','volibear','warwick','wukong','xayah','xerath','xinzhao',
  'yasuo','yone','yorick','yunara','yuumi','zac','zed','zeri','ziggs','zilean','zoe','zyra',
]

const RANKS = [
  { label: 'Iron',        src: '/resources/rang/Iron.webp' },
  { label: 'Bronze',      src: '/resources/rang/Bronze.webp' },
  { label: 'Silver',      src: '/resources/rang/Silver.webp' },
  { label: 'Gold',        src: '/resources/rang/Gold.webp' },
  { label: 'Platinum',    src: '/resources/rang/Platinum.webp' },
  { label: 'Emerald',     src: '/resources/rang/Emerald.webp' },
  { label: 'Diamond',     src: '/resources/rang/diamond.webp' },
  { label: 'Master',      src: '/resources/rang/Master.webp' },
  { label: 'Grandmaster', src: '/resources/rang/Grandmaster.webp' },
  { label: 'Challenger',  src: '/resources/rang/Challenger.webp' },
]

const KEYSTONES = [
  { name: 'Press the Attack',      src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/press_the_attack.png' },
  { name: 'Lethal Tempo',          src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/lethal_tempo.png' },
  { name: 'Fleet Footwork',        src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Fleet_Footwork_rune.png' },
  { name: 'Conqueror',             src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Conqueror_rune.png' },
  { name: 'Electrocute',           src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Electrocute_rune.png' },
  { name: 'Dark Harvest',          src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Dark_Harvest_rune.png' },
  { name: 'Hail of Blades',        src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Hail_of_Blades_rune.png' },
  { name: 'Arcane Comet',          src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Arcane_Comet_rune.png' },
  { name: 'Phase Rush',            src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Phase_Rush_rune.png' },
  { name: 'Glacial Augment',       src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Glacial_Augment_rune.png' },
  { name: 'Unsealed Spellbook',    src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/unsealed_spellbook.png' },
  { name: 'Grasp of the Undying',  src: 'https://ddragon.leagueoflegends.com/cdn/img/icons/runes/Grasp_of_the_Undying_rune.png' },
  { name: 'Axiom Arcanist',        src: 'https://ddragon.leagueoflegends.com/cdn/15.15.1/img/perk-images/Styles/Sorcery/NullifyingOrb/Axiom_Arcanist.png' },
  { name: 'Unflinching',           src: 'https://ddragon.leagueoflegends.com/cdn/15.15.1/img/perk-images/Styles/Sorcery/Unflinching/Unflinching.png' },
]

// ─── Onglets ──────────────────────────────────────────────────────────────────

type Tab = 'champions' | 'rangs' | 'runes' | 'upload'

const TABS: { id: Tab; label: string }[] = [
  { id: 'champions', label: 'Champions' },
  { id: 'rangs',     label: 'Rangs' },
  { id: 'runes',     label: 'Runes' },
  { id: 'upload',    label: 'Mon image' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  /** Appelé avec l'URL finale (preset = URL statique, upload = URL Supabase) */
  onSelect: (url: string) => Promise<void>
  /** Appelé uniquement pour l'upload perso : reçoit le File brut */
  onUpload: (file: File) => Promise<void>
  uploading: boolean
  uploadError: string | null
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AvatarPickerModal({ onClose, onSelect, onUpload, uploading, uploadError }: Props) {
  const [tab, setTab] = useState<Tab>('champions')
  const [search, setSearch] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePreset(url: string) {
    setApplying(url)
    try {
      await onSelect(url)
      onClose()
    } finally {
      setApplying(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file).then(() => {
      if (!uploadError) onClose()
    })
    e.target.value = ''
  }

  const filteredChampions = search.trim()
    ? CHAMPIONS.filter((c) => c.includes(search.toLowerCase().replace(/[^a-z0-9]/g, '')))
    : CHAMPIONS

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl flex flex-col w-full max-w-2xl"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="font-display text-lg font-bold text-white">Choisir un avatar</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-bg/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Onglets */}
        <div className="shrink-0 flex border-b border-dark-border px-6 pt-3 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch('') }}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-accent-blue text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">

          {/* ── Champions ── */}
          {tab === 'champions' && (
            <>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un champion…"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/50"
                />
              </div>
              <div className="grid grid-cols-8 gap-2">
                {filteredChampions.map((champ) => {
                  const url = `/resources/champions/icons/${champ}.jpg`
                  const isApplying = applying === url
                  return (
                    <button
                      key={champ}
                      onClick={() => handlePreset(url)}
                      disabled={!!applying || uploading}
                      title={champ}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-dark-border hover:border-accent-blue/60 transition-all disabled:opacity-60"
                    >
                      <img
                        src={url}
                        alt={champ}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                        loading="lazy"
                      />
                      {isApplying && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {filteredChampions.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">Aucun champion trouvé.</p>
              )}
            </>
          )}

          {/* ── Rangs ── */}
          {tab === 'rangs' && (
            <div className="grid grid-cols-5 gap-4">
              {RANKS.map(({ label, src }) => {
                const isApplying = applying === src
                return (
                  <button
                    key={src}
                    onClick={() => handlePreset(src)}
                    disabled={!!applying || uploading}
                    className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-dark-border hover:border-accent-blue/50 bg-dark-bg/40 hover:bg-accent-blue/5 transition-all disabled:opacity-60"
                  >
                    <div className="relative w-16 h-16">
                      <img
                        src={src}
                        alt={label}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                      />
                      {isApplying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Runes ── */}
          {tab === 'runes' && (
            <div className="grid grid-cols-5 gap-4">
              {KEYSTONES.map(({ name, src }) => {
                const isApplying = applying === src
                return (
                  <button
                    key={src}
                    onClick={() => handlePreset(src)}
                    disabled={!!applying || uploading}
                    title={name}
                    className="group flex flex-col items-center gap-2 p-3 rounded-2xl border border-dark-border hover:border-purple-500/50 bg-dark-bg/40 hover:bg-purple-500/5 transition-all disabled:opacity-60"
                  >
                    <div className="relative w-14 h-14">
                      <img
                        src={src}
                        alt={name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                        loading="lazy"
                      />
                      {isApplying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Upload perso ── */}
          {tab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-8 gap-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`w-full max-w-sm border-2 border-dashed border-dark-border rounded-2xl p-10 flex flex-col items-center gap-3 transition-colors ${
                  uploading ? 'opacity-60 cursor-wait' : 'hover:border-accent-blue/50 cursor-pointer'
                }`}
              >
                {uploading ? (
                  <Loader2 size={36} className="text-accent-blue animate-spin" />
                ) : (
                  <Upload size={36} className="text-gray-500" />
                )}
                <p className="text-gray-300 font-medium text-sm text-center">
                  {uploading ? 'Upload en cours…' : 'Cliquez pour choisir une image'}
                </p>
                <p className="text-xs text-gray-600 text-center">JPG, PNG, WebP · max 2 Mo</p>
              </div>
              {uploadError && (
                <p className="text-sm text-red-400 text-center">{uploadError}</p>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}
