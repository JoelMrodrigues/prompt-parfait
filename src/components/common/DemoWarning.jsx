import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export const DemoWarning = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-accent-gold/10 border border-accent-gold/30 rounded-lg p-4 mb-6"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="text-accent-gold mt-0.5 flex-shrink-0" size={20} />
        <div>
          <h3 className="font-semibold text-accent-gold mb-1">Mode Démo</h3>
          <p className="text-sm text-gray-300">
            Supabase n'est pas configuré. Certaines fonctionnalités (authentification, sauvegarde) sont désactivées.
            <a href="#config" className="text-accent-blue hover:underline ml-1">
              Configurer Supabase →
            </a>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
