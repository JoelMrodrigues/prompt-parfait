/**
 * Page Planning - Coming soon avec aperçu des fonctionnalités
 */
import { CalendarDays, Swords, ClipboardList, BarChart2, Users, Clock } from 'lucide-react'

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Calendrier des scrims',
    description: "Planifiez vos sessions d'entraînement avec une vue calendrier claire.",
  },
  {
    icon: Swords,
    title: 'Gestion des adversaires',
    description: 'Enregistrez les équipes adverses, leurs résultats et vos notes sur eux.',
  },
  {
    icon: ClipboardList,
    title: 'Notes par session',
    description: "Ajoutez des notes d'avant/après match directement depuis le planning.",
  },
  {
    icon: BarChart2,
    title: 'Suivi des résultats',
    description: 'Visualisez votre win rate en scrim et votre évolution dans le temps.',
  },
  {
    icon: Users,
    title: 'Disponibilités joueurs',
    description: 'Consultez les disponibilités de chaque joueur pour planifier sans conflit.',
  },
  {
    icon: Clock,
    title: 'Rappels automatiques',
    description: 'Notifications avant chaque session pour que tout le monde soit prêt.',
  },
]

export const PlanningPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-2">Planning</h2>
        <p className="text-gray-400">{"Organisez vos scrims et suivez votre programme d'entraînement"}</p>
      </div>

      {/* Banner "Bientôt" */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-500/15 border border-purple-500/30 mb-4">
          <CalendarDays size={26} className="text-purple-400" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-bg border border-dark-border text-xs font-semibold text-gray-500 mb-3 ml-3 align-middle">
          Bientôt
        </div>
        <h3 className="font-display text-xl font-bold mb-2">Module planning en développement</h3>
        <p className="text-gray-400 max-w-md mx-auto text-sm">
          {"Planifiez vos scrims, gérez les disponibilités et suivez vos résultats d'entraînement depuis un seul endroit."}
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
