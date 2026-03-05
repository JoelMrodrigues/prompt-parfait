import { motion } from 'framer-motion'

export const TeamSide = ({ team, picks, bans, isActive }) => {
  const isBlue = team === 'blue'

  return (
    <div
      className={`flex-1 flex flex-col gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${
        isActive
          ? isBlue
            ? 'border-accent-blue/60 bg-accent-blue/5 shadow-[0_0_30px_rgba(147,51,234,0.1)]'
            : 'border-red-500/60 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
          : 'border-dark-border bg-dark-card/50'
      }`}
    >
      {/* Label équipe */}
      <h2
        className={`font-display text-base font-bold text-center tracking-widest uppercase ${
          isBlue ? 'text-accent-blue' : 'text-red-400'
        }`}
      >
        {isBlue ? 'Blue Side' : 'Red Side'}
      </h2>

      {/* Bans — petits carrés en haut */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Bans</p>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const ban = bans[i]
            return (
              <div
                key={i}
                className="aspect-square rounded-lg bg-dark-bg border border-dark-border overflow-hidden relative"
              >
                {ban ? (
                  <>
                    <img
                      src={ban.image}
                      alt={ban.name}
                      className="w-full h-full object-cover saturate-0 opacity-30"
                    />
                    <svg
                      viewBox="0 0 100 100"
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <line x1="12" y1="12" x2="88" y2="88" stroke="rgb(239,68,68)" strokeWidth="10" strokeLinecap="round" />
                      <line x1="88" y1="12" x2="12" y2="88" stroke="rgb(239,68,68)" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 text-lg leading-none">
                    ×
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Picks — 5 slots verticaux hauts */}
      <div className="flex flex-col gap-2 flex-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Picks</p>
        {Array.from({ length: 5 }).map((_, i) => {
          const pick = picks[i]
          return (
            <motion.div
              key={i}
              className={`relative h-14 rounded-xl overflow-hidden border transition-colors ${
                pick
                  ? isBlue
                    ? 'border-accent-blue/30'
                    : 'border-red-500/30'
                  : 'border-dark-border'
              } bg-dark-bg`}
            >
              {pick ? (
                <>
                  <motion.img
                    initial={{ scale: 1.15, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={pick.image}
                    alt={pick.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/20" />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-white text-xs font-semibold drop-shadow truncate">
                      {pick.name}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center gap-2 px-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                    isBlue ? 'border-accent-blue/30 text-accent-blue/40' : 'border-red-500/30 text-red-500/40'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-gray-700 text-xs">En attente…</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
