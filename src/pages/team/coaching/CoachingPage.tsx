/**
 * Page Coaching - Coming soon avec aperçu des fonctionnalités
 */
import { MessageSquare, User, Users, FileText, Video, Target, Bell } from 'lucide-react'

const FEATURES = [
  {
    icon: User,
    title: 'Notes individuelles',
    description: "Suivez les axes d'amélioration de chaque joueur, session par session.",
  },
  {
    icon: Users,
    title: "Notes d'équipe",
    description: 'Centralisez les retours collectifs après chaque scrim ou tournoi.',
  },
  {
    icon: FileText,
    title: 'Rapports de coaching',
    description: "Générez des comptes-rendus structurés pour vos sessions avec l'équipe.",
  },
  {
    icon: Target,
    title: 'Objectifs & suivi',
    description: 'Définissez des objectifs mesurables et trackez leur progression.',
  },
  {
    icon: Video,
    title: 'Liens VOD',
    description: 'Associez des replays YouTube/Twitch à vos notes pour illustrer les points clés.',
  },
  {
    icon: Bell,
    title: 'Rappels',
    description: 'Programmez des rappels pour revoir des points importants avant les matchs.',
  },
]

export const CoachingPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-2">Coaching</h2>
        <p className="text-gray-400">{"Notes individuelles et d'équipe pour structurer votre coaching"}</p>
      </div>

      {/* Banner "Bientôt" */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-blue/15 border border-accent-blue/30 mb-4">
          <MessageSquare size={26} className="text-accent-blue" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-bg border border-dark-border text-xs font-semibold text-gray-500 mb-3 ml-3 align-middle">
          Bientôt
        </div>
        <h3 className="font-display text-xl font-bold mb-2">Module coaching en développement</h3>
        <p className="text-gray-400 max-w-md mx-auto text-sm">
          Un espace dédié pour structurer votre coaching, centraliser les retours et suivre la
          progression de chaque joueur.
        </p>
      </div>

      {/* Aperçu des fonctionnalités */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-600 uppercase mb-4">
          Ce qui arrive
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className="bg-dark-card border border-dark-border rounded-lg p-4 flex gap-3 opacity-75"
              >
                <div className="p-1.5 bg-dark-bg rounded-lg shrink-0 h-fit">
                  <Icon size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">{feat.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{feat.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
