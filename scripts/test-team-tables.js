import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uyuluvszuefnhadlavgqf.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY manquante')
  console.error('   Ajoute-la dans ton fichier .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testTables() {
  console.log('🔍 Test de connexion aux tables...\n')
  
  // Test 1: Vérifier si les tables existent
  console.log('1️⃣ Test d\'existence des tables...')
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('count')
      .limit(0)
    
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        console.error('❌ La table "teams" n\'existe pas dans Supabase')
        console.error('   Exécute le fichier supabase/supabase-team-schema.sql dans le SQL Editor de Supabase')
      } else {
        console.error('❌ Erreur:', error.message)
        console.error('   Code:', error.code)
      }
    } else {
      console.log('✅ La table "teams" existe')
    }
  } catch (err) {
    console.error('❌ Erreur de connexion:', err.message)
  }
  
  // Test 2: Vérifier l'authentification
  console.log('\n2️⃣ Test d\'authentification...')
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ Erreur de session:', error.message)
    } else if (session) {
      console.log('✅ Utilisateur connecté:', session.user.email)
      console.log('   User ID:', session.user.id)
    } else {
      console.log('⚠️  Aucun utilisateur connecté')
      console.log('   Connecte-toi d\'abord avec: test@test.com / test')
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message)
  }
  
  // Test 3: Vérifier les policies RLS
  console.log('\n3️⃣ Test des policies RLS...')
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', session.user.id)
      
      if (error) {
        console.error('❌ Erreur RLS:', error.message)
        console.error('   Code:', error.code)
        if (error.code === 'PGRST301' || error.message.includes('permission')) {
          console.error('   Les policies RLS bloquent l\'accès')
          console.error('   Vérifie que les policies sont bien créées dans Supabase')
        }
      } else {
        console.log('✅ Les policies RLS fonctionnent')
        console.log('   Équipes trouvées:', data?.length || 0)
      }
    } else {
      console.log('⚠️  Impossible de tester RLS sans session')
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message)
  }
  
  console.log('\n💡 Si les tables n\'existent pas:')
  console.log('   1. Va dans Supabase > SQL Editor')
  console.log('   2. Copie-colle le contenu de supabase/supabase-team-schema.sql')
  console.log('   3. Exécute le script')
}

testTables()
