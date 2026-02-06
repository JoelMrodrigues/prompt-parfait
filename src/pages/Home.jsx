import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export const Home = () => {
  const features = [
    {
      title: 'Draft Simulator',
      description: 'Entraînez-vous avec un simulateur réaliste mode tournoi',
      icon: '🎮',
    },
    {
      title: 'Stats Avancées',
      description: 'Analysez les performances des champions et joueurs',
      icon: '📊',
    },
    {
      title: 'Team Management',
      description: 'Gérez votre équipe et les pools de champions',
      icon: '👥',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 via-transparent to-accent-gold/10" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6"
        >
          <h1 className="font-display text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-accent-blue via-white to-accent-gold bg-clip-text text-transparent">
            LoL Draft Pro
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
            L'outil ultime pour maîtriser vos drafts League of Legends
          </p>
          <Link
            to="/draft"
            className="inline-block px-8 py-4 bg-accent-blue text-white rounded-lg text-lg font-semibold hover:bg-accent-blue/90 transition-all hover:scale-105 glow-blue"
          >
            Commencer une draft
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-4xl font-bold text-center mb-16"
          >
            Fonctionnalités
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-dark-card border border-dark-border rounded-lg hover:border-accent-blue transition-all hover:scale-105"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-dark-card">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="font-display text-4xl font-bold mb-6">
            Prêt à améliorer vos drafts ?
          </h2>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-accent-gold text-dark-bg rounded-lg text-lg font-semibold hover:bg-accent-gold/90 transition-all hover:scale-105 glow-gold"
          >
            Créer un compte gratuitement
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
