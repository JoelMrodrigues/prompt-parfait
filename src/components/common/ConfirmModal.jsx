import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export const ConfirmModal = ({ 
  title = 'Confirmer',
  message = 'Êtes-vous sûr ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  type = 'danger' // 'danger' | 'warning' | 'info'
}) => {
  const colors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-accent-gold hover:bg-accent-gold/90',
    info: 'bg-accent-blue hover:bg-accent-blue/90',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-accent-gold" size={24} />
          <h2 className="font-display text-xl font-bold">{title}</h2>
        </div>

        <p className="text-gray-400 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-gray-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
