import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import axios from 'axios'
import { loadServerEnv, resolveRiotApiKey } from './config/env.js'
import riotRoutes from './routes/riot.routes.js'
import statsRoutes from './routes/stats.routes.js'
import lcuRoutes from './routes/lcu.routes.js'
import analyseRoutes from './routes/analyse.routes.js'

loadServerEnv()
resolveRiotApiKey()

if (process.env.NODE_ENV !== 'production') {
  console.log('[Startup] RIOT_API_KEY présent:', !!String(process.env.RIOT_API_KEY || '').trim())
}

const app = express()
const PORT = process.env.PORT || 3001

const prodOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
  : []

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true)
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin)
    if (isLocalhost || prodOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origine non autorisée — ${origin}`))
  },
  credentials: true,
}

app.set('trust proxy', 1) // Railway est derrière un reverse proxy
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors(corsOptions))
app.use(express.json({ limit: '50kb' }))

// Rate limiting — 100 req/min par IP sur les routes API
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes — réessayez dans 1 minute' },
})
app.use('/api', apiLimiter)

app.use('/api/riot', riotRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/lcu', lcuRoutes)
app.use('/api/analyse', analyseRoutes)

app.get('/', (_req, res) => res.json({ ok: true, service: 'prompt-parfait-api', endpoints: ['/health', '/api/riot/...', '/api/stats/...'] }))
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.status(204).end())

// Error handler global — catch les erreurs async non gérées
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ success: false, error: 'Erreur serveur interne' })
})

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
