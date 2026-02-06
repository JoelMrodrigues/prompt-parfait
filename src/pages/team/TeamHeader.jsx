/**
 * Header de la page Team
 * Affiche les infos de l'équipe et actions rapides
 */
import { Settings, Users } from 'lucide-react'

export const TeamHeader = ({ team }) => {
  return (
    <header className="bg-dark-card border-b border-dark-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Team Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center">
            <Users size={24} className="text-accent-blue" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {team?.team_name || 'Aucune équipe'}
            </h1>
            {team && (
              <p className="text-sm text-gray-400">
                Créée le {new Date(team.created_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-bg rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
