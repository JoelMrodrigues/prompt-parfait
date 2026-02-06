import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

// Extraire l'URL depuis les arguments ou les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://uyuluvszuefnhadlavgqf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bHV2c3p1ZWZuaGFkbGF2Z3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4OTI0OCwiZXhwIjoyMDg0NjY1MjQ4fQ.8KyXA_jDaTrJttGVyhXeXMg6n9pW1hm-ZUsfiOKPItc'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:')
  console.error('   - VITE_SUPABASE_URL ou SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\n💡 Pour créer un compte de test, tu dois avoir la clé service role de Supabase.')
  console.error('   Tu peux la trouver dans ton projet Supabase > Settings > API > service_role key')
  process.exit(1)
}

// Créer un client avec la clé service role (permet de créer des utilisateurs)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  const email = 'test@test.com'
  const password = 'test'

  try {
    console.log('📝 Création du compte de test...')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      console.log('⚠️  L\'utilisateur existe déjà. Suppression...')
      await supabase.auth.admin.deleteUser(existingUser.id)
    }

    // Créer le nouvel utilisateur
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Confirmer l'email automatiquement
    })

    if (error) {
      console.error('❌ Erreur lors de la création:', error.message)
      process.exit(1)
    }

    console.log('✅ Compte de test créé avec succès!')
    console.log('\n📋 Informations de connexion:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log('\n💡 Tu peux maintenant te connecter avec ces identifiants.')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

createTestUser()
