/**
 * Page Paramètres — préférences de l'application
 */
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export const SettingsPage = () => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="max-w-xl mx-auto pt-8 px-4 pb-12">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-1">Paramètres</h2>
        <p className="text-gray-400">Personnalisez votre expérience</p>
      </div>

      {/* Apparence */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider mb-5">
          Apparence
        </h3>

        {/* Mode sombre */}
        <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-dark-card rounded-lg border border-dark-border">
              {isDark ? (
                <Moon size={17} className="text-accent-blue" />
              ) : (
                <Sun size={17} className="text-accent-blue" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">Mode sombre</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isDark ? 'Activé' : 'Désactivé'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Basculer le mode sombre"
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              isDark ? 'bg-accent-blue' : 'bg-dark-border'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-off-white shadow-sm transition-transform duration-200 ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
