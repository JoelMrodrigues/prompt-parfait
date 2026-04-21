import { Router, Request, Response } from 'express'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { reloadRiotKeysFromDb } from '../lib/riotClient.js'

const router = Router()

async function requireAdmin(req: Request, res: Response, next: () => void) {
  const db = getSupabaseAdmin()
  if (!db) return res.status(503).json({ error: 'Supabase admin non configuré' })
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token invalide' })
  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return res.status(403).json({ error: 'Accès refusé' })
  next()
}

router.post('/reload', requireAdmin as any, async (_req: Request, res: Response) => {
  await reloadRiotKeysFromDb()
  res.json({ ok: true })
})

export default router
