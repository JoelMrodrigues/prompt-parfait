/**
 * TestPage — bac à sable isolé.
 * ⚠️ Cette page est VOLONTAIREMENT déconnectée du reste du site.
 *    - Pas de useTeam / useAuth / contextes en écriture
 *    - Tout état est local à ce fichier
 *    - Les modifs ici n'affectent JAMAIS les autres pages
 */

export const TestPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
          SANDBOX
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Page de test</h1>
      </div>

      <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card/30 p-8 text-center">
        <p className="text-gray-500 text-sm">Zone de développement isolée — rien ici n'affecte le reste du site.</p>
      </div>
    </div>
  )
}
