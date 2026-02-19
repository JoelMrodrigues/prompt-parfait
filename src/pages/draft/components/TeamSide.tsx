import { motion } from 'framer-motion'

export const TeamSide = ({ team, picks, bans, isActive }) => {
  const teamColor = team === 'blue' ? 'accent-blue' : 'red-500'

  return (
    <div
      className={`flex-1 p-6 border-2 rounded-lg transition-all ${
        isActive
          ? `border-${teamColor} glow-${team === 'blue' ? 'blue' : 'gold'}`
          : 'border-dark-border'
      }`}
    >
      <h2
        className={`font-display text-2xl font-bold mb-6 text-center ${
          team === 'blue' ? 'text-accent-blue' : 'text-red-500'
        }`}
      >
        {team === 'blue' ? 'Blue Side' : 'Red Side'}
      </h2>

      {/* Picks */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">PICKS</h3>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const pick = picks[i]
            return (
              <div
                key={i}
                className="aspect-square rounded-lg bg-dark-bg border border-dark-border overflow-hidden"
              >
                {pick ? (
                  <motion.img
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    src={pick.image}
                    alt={pick.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                    {i + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bans */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">BANS</h3>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const ban = bans[i]
            return (
              <div
                key={i}
                className="aspect-square rounded-lg bg-dark-bg border border-dark-border overflow-hidden relative"
              >
                {ban ? (
                  <>
                    <motion.img
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      src={ban.image}
                      alt={ban.name}
                      className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45"></div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    Ban
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
