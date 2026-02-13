/**
 * Crée les comptes pour l'équipe (joueurs, coach, etc.)
 * Usage: node scripts/create-team-users.js
 * Requiert: SUPABASE_SERVICE_ROLE_KEY dans .env ou .env.local
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables manquantes dans .env:')
  console.error('   VITE_SUPABASE_URL (ou SUPABASE_URL)')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\n💡 Clé service_role : Supabase Dashboard → Settings → API')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERNAMES = ['shayn', 'marcel', 'erzonne', 'aitlade', 'fabio', 'wydz', 'tixty', 'spectros', 'kingkong']
const PASSWORD = '123'
const EMAIL_DOMAIN = '@prompt-parfait.local'

async function createTeamUsers() {
  console.log('📝 Création des comptes équipe...\n')

  const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, team_name').limit(1)
  if (teamsErr || !teams?.length) {
    console.error('❌ Aucune équipe trouvée. Crée d\'abord une équipe depuis l\'app (Vue d\'ensemble).')
    process.exit(1)
  }
  const teamId = teams[0].id
  const teamName = teams[0].team_name || 'Short Cut'
  console.log(`   Équipe: ${teamName}\n`)

  for (const username of USERNAMES) {
    const email = `${username}${EMAIL_DOMAIN}`
    let userId = null

    try {
      const { data: existing } = await supabase.auth.admin.listUsers()
      const existingUser = existing?.users?.find((u) => u.email === email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`⏭️  ${username} existe déjà`)
      } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
        })
        if (error) {
          console.error(`❌ ${username}: ${error.message}`)
          continue
        }
        userId = newUser?.user?.id
        console.log(`✅ ${username} créé`)
      }

      if (userId) {
        const { error: memberErr } = await supabase.from('team_members').upsert(
          { team_id: teamId, user_id: userId, role: 'member' },
          { onConflict: 'team_id,user_id', ignoreDuplicates: true }
        )
        if (memberErr) {
          console.error(`   ⚠️  Équipe: ${memberErr.message}`)
        } else {
          console.log(`   → Ajouté à l'équipe`)
        }
      }
    } catch (e) {
      console.error(`❌ ${username}:`, e.message)
    }
  }

  console.log('\n📋 Connexion : pseudo (ex: shayn) ou email, mot de passe = 123')
  console.log('   Accès direct à l\'équipe sans lien d\'invitation.')
}

createTeamUsers()
