/**
 * Importe les runes Data Dragon (runesReforged.json) dans Supabase lol_runes.
 * Usage: node scripts/import-dragon-runes.js
 * Requiert: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) dans .env
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables manquantes dans .env:')
  console.error('   VITE_SUPABASE_URL (ou SUPABASE_URL)')
  console.error('   SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DD_VERSION = '14.24.1'
const RUNES_REFORGED_URL = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/data/en_GB/runesReforged.json`

function flattenRunes(trees) {
  const rows = []
  for (const tree of trees || []) {
    const treeId = tree.id
    const treeKey = tree.key || ''
    const treeName = tree.name || ''
    const slots = tree.slots || []
    slots.forEach((slot, slotIndex) => {
      const runes = slot.runes || []
      runes.forEach((r) => {
        rows.push({
          id: r.id,
          tree_id: treeId,
          tree_key: treeKey,
          tree_name: treeName,
          slot_index: slotIndex,
          key: r.key || '',
          name: r.name || '',
          icon: r.icon || '',
          short_desc: r.shortDesc ?? r.short_desc ?? null,
          long_desc: r.longDesc ?? r.long_desc ?? null,
        })
      })
    })
  }
  return rows
}

async function main() {
  console.log('📥 Récupération runesReforged.json (Data Dragon)...')
  const res = await fetch(RUNES_REFORGED_URL)
  if (!res.ok) {
    console.error('❌ Erreur fetch:', res.status, res.statusText)
    process.exit(1)
  }
  const trees = await res.json()
  const rows = flattenRunes(trees)
  console.log('   Runes trouvées:', rows.length)

  console.log('📤 Upsert dans Supabase (lol_runes)...')
  const { error } = await supabase.from('lol_runes').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('❌ Erreur Supabase:', error.message)
    process.exit(1)
  }
  console.log('✅ Import terminé.')
}

main()
