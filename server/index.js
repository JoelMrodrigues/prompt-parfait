import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { loadServerEnv, resolveRiotApiKey } from './config/env.js'
import riotRoutes from './routes/riot.routes.js'
import statsRoutes from './routes/stats.routes.js'

loadServerEnv()
resolveRiotApiKey()

const app = express()
const PORT = process.env.PORT || 3001

const corsOptions = process.env.FRONTEND_URL
  ? { origin: process.env.FRONTEND_URL.split(',').map((u) => u.trim()), credentials: true }
  : {}

app.use(cors(corsOptions))
app.use(express.json())

app.use('/api/riot', riotRoutes)
app.use('/api/stats', statsRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_, res) => res.status(204).end())

app.listen(PORT, async () => {
  const apiKey = (process.env.RIOT_API_KEY || '').trim().replace(/\r/g, '')
  if (apiKey !== process.env.RIOT_API_KEY) process.env.RIOT_API_KEY = apiKey

  console.log(`\n🚀 API (Riot + Stats): http://localhost:${PORT}`)
  console.log(`   RIOT_API_KEY : ${apiKey ? '✓ chargée' : '✗ manquante'}`)

  if (apiKey) {
    try {
      const r = await axios.get('https://euw1.api.riotgames.com/lol/status/v4/platform-data', {
        headers: { 'X-Riot-Token': apiKey },
        timeout: 10000,
        validateStatus: () => true,
      })
      console.log(r.status === 200 ? '   Riot API : ✓ clé valide' : `   Riot API : ✗ clé refusée (${r.status})`)
    } catch (_) {
      console.log('   Riot API : ? test échoué (réseau?)')
    }
  }

  console.log(`   Routes disponibles:`)
  console.log(`     GET /api/riot/sync-rank?pseudo=...`)
  console.log(`     GET /api/riot/player-stats?pseudo=...&region=euw1`)
  console.log(`     GET /api/stats/years`)
  console.log(`     GET /api/stats/filters?year=2026`)
  console.log(`     GET /api/stats/champions?year=2026&role=mid&league=LEC`)
  console.log(`     GET /api/stats/champion/:name?year=2026`)
  console.log(`     GET /api/stats/match/:gameid?year=2026`)
  console.log(`     GET /api/stats/team-names?year=2026&gameids=id1,id2`)
  console.log(`     GET /health\n`)
})
