import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export const InitModal = ({ onStart, onClose }) => {
  const [side, setSide] = useState('blue')
  const [skipBans, setSkipBans] = useState(false)

  const handleStart = () => {
    onStart({ side, skipBans })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-lg p-8 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-2xl font-bold">Configuration de la Draft</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Votre côté</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSide('blue')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  side === 'blue'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-dark-border hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-lg mb-1">Blue Side</div>
                <div className="text-sm opacity-70">Premier pick</div>
              </button>
              <button
                onClick={() => setSide('red')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  side === 'red'
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-dark-border hover:border-gray-600'
                }`}
              >
                <div className="font-bold text-lg mb-1">Red Side</div>
                <div className="text-sm opacity-70">Dernier pick</div>
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipBans}
                onChange={(e) => setSkipBans(e.target.checked)}
                className="w-5 h-5 rounded border-dark-border bg-dark-bg checked:bg-accent-blue focus:ring-2 focus:ring-accent-blue"
              />
              <span className="text-sm">Passer les bans (picks uniquement)</span>
            </label>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 bg-accent-blue text-white rounded-lg font-semibold hover:bg-accent-blue/90 transition-all hover:scale-[1.02] glow-blue"
          >
            Démarrer la draft
          </button>
        </div>
      </motion.div>
    </div>
  )
}
