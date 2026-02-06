/**
 * API backend pour récupérer rank + top champions depuis dpm.lol
 * Évite CORS et utilise les vrais sélecteurs de la page.
 */
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { formatChampionName } from './formatChampionName.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

/**
 * Extrait le rank depuis le HTML de la page principale dpm.lol
 */
function extractRank(html) {
  const $ = cheerio.load(html)
  const bodyText = $('body').text() || ''
  const patternWithLP =
    /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)\s*LP/gi
  const matches = [...bodyText.matchAll(patternWithLP)]
  if (matches.length > 0) {
    const priority = matches.find(
      (m) =>
        /master|grandmaster|challenger/i.test(m[0])
    )
    return (priority || matches[0])[0].trim()
  }
  const noLP =
    /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)/gi
  const m2 = bodyText.match(noLP)
  return m2 ? m2[0].trim() : null
}

/**
 * Extrait les top champions depuis le HTML de la page /champions
 * Structure réelle: div.text-bm.grid.grid-cols-5 avec img[src*="champion/XXX"], span pour games, span.text-yellow-300 pour winrate
 */
function extractChampions(html) {
  const $ = cheerio.load(html)
  const champions = []

  // Lignes: div avec grid-cols-5 et col-span-5 (une par champion)
  const rows = $(
    'div.grid.grid-cols-5.col-span-5, div[class*="grid-cols-5"][class*="col-span-5"]'
  )

  rows.each((_, el) => {
    const $row = $(el)
    const $img = $row.find('img[src*="champion"], img[srcset*="champion"]').first()
    const src =
      $img.attr('src') || $img.attr('srcset') || ''
    const match = src.match(/champion[\/%2F](\w+)/i)
    if (!match) return

    const slug = match[1]
    const name = formatChampionName(slug)

    // Winrate: span.text-yellow-300 contenant "75%"
    const winrateText = $row.find('span.text-yellow-300').first().text().trim()
    const winrateMatch = winrateText.match(/(\d+)/)
    const winrate = winrateMatch ? parseInt(winrateMatch[1], 10) : null

    // Games: span qui contient uniquement un nombre (souvent entre KDA et WR)
    let games = null
    $row.find('span').each((_, span) => {
      const t = $(span).text().trim()
      if (/^\d+$/.test(t)) {
        const n = parseInt(t, 10)
        if (n >= 1 && n <= 1000) games = n
        return false // break
      }
    })

    if (name) {
      champions.push({
        name,
        games: games ?? undefined,
        winrate: winrate ?? undefined,
      })
    }
  })

  // Trier par parties (desc), puis winrate (desc)
  champions.sort((a, b) => {
    const ga = a.games || 0
    const gb = b.games || 0
    if (gb !== ga) return gb - ga
    return (b.winrate || 0) - (a.winrate || 0)
  })

  return champions.slice(0, 5)
}

/**
 * GET /api/dpm?pseudo=Marcel%20le%20Zgeg-BACK
 * Retourne { success, rank, champions } comme attendu par le front (usePlayerSync).
 */
app.get('/api/dpm', async (req, res) => {
  const pseudo = req.query.pseudo
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=Marcel%20le%20Zgeg-BACK)',
    })
  }

  const formatted = pseudo.trim().replace(/#/g, '-')
  const encoded = encodeURIComponent(formatted)
  const mainUrl = `https://dpm.lol/${encoded}?queue=solo`
  const championsUrl = `https://dpm.lol/${encoded}/champions?queue=solo`

  try {
    const [mainRes, championsRes] = await Promise.all([
      axios.get(mainUrl, { headers: HEADERS, timeout: 12000 }),
      axios.get(championsUrl, { headers: HEADERS, timeout: 12000 }),
    ])

    const rank = extractRank(mainRes.data)
    const champions = extractChampions(championsRes.data)

    res.json({
      success: true,
      rank: rank || null,
      topChampions: champions.length > 0 ? champions : null,
      scrapedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('DPM API error:', err.message)
    const status = err.response?.status || 500
    res.status(status).json({
      success: false,
      error: err.response?.data ? 'dpm.lol unreachable' : err.message,
    })
  }
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`\n🚀 DPM API: http://localhost:${PORT}`)
  console.log(`   GET /api/dpm?pseudo=...  → rank + top 5 champions`)
  console.log(`   GET /health\n`)
})
