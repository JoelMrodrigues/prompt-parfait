/**
 * Page Drafts — lance le Draft Simulator en contexte équipe
 */
import { Link } from 'react-router-dom'
import { Swords, ChevronRight, BarChart3, BookOpen, Star } from 'lucide-react'

const COMING = [
  {
    icon: BookOpen,
    title: 'Drafts sauvegardées',
    description: "Enregistrez vos schémas de draft préférés et retrouvez-les d'une session à l'autre.",
  },
  {
    icon: Star,
    title: 'Drafts par adversaire',
    description: "Préparez des drafts spécifiques selon l'équipe affrontée et leurs tendances.",
  },
  {
    icon: BarChart3,
    title: 'Historique & stats',
    description: 'Analysez vos drafts passées : picks les plus joués, bans prioritaires, winrate par composition.',
  },
]

export const DraftsPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-2">Drafts</h2>
        <p className="text-gray-400">Préparez et organisez vos schémas de draft</p>
      </div>

      {/* CTA principal vers le simulateur */}
      <div className="bg-dark-card border border-accent-blue/30 rounded-2xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/8 to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center shrink-0">
            <Swords size={30} className="text-accent-blue" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold text-white mb-1">Draft Simulator</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Simulez vos picks/bans en conditions réelles. Entraînez-vous avec votre pool de champions,
              testez des compositions et préparez votre prochaine série.
            </p>
          </div>
          <Link
            to="/draft"
            className="inline-flex items-center gap-2 px-5 py-3 bg-accent-blue text-white rounded-xl font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue shrink-0 text-sm"
          >
            Lancer la draft
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Fonctionnalités à venir */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-600 uppercase mb-4">
          Prochainement
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COMING.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                className="bg-dark-card border border-dark-border rounded-xl p-4 flex gap-3 opacity-60"
              >
                <div className="p-1.5 bg-dark-bg rounded-lg shrink-0 h-fit">
                  <Icon size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">{feat.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
