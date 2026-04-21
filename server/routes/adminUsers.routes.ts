import { Router, Request, Response } from 'express'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'

const router = Router()

// ─── Middleware admin ─────────────────────────────────────────────────────────

async function requireAdmin(req: Request, res: Response, next: () => void) {
  const db = getSupabaseAdmin()
  if (!db) return res.status(503).json({ error: 'Supabase admin non configuré' })
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token manquant' })

  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Token invalide' })

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return res.status(403).json({ error: 'Accès refusé' })
  next()
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', requireAdmin as any, async (_req: Request, res: Response) => {
  const db = getSupabaseAdmin()!
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error) return res.status(500).json({ error: error.message })

  // Merge avec profiles pour display_name, last_seen_at, is_admin
  const { data: profiles } = await db
    .from('profiles')
    .select('id, display_name, last_seen_at, is_admin, is_suspended, active_team_id')

  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.id] = p

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    display_name: profileMap[u.id]?.display_name || null,
    last_seen_at: profileMap[u.id]?.last_seen_at || null,
    is_admin: profileMap[u.id]?.is_admin || false,
    is_suspended: profileMap[u.id]?.is_suspended || false,
    has_team: !!profileMap[u.id]?.active_team_id,
  }))

  res.json(users)
})

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────

router.patch('/users/:id', requireAdmin as any, async (req: Request, res: Response) => {
  const { id } = req.params
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email && !password) return res.status(400).json({ error: 'email ou password requis' })

  const updates: { email?: string; password?: string } = {}
  if (email?.trim())    updates.email    = email.trim()
  if (password?.trim()) updates.password = password.trim()

  const db = getSupabaseAdmin()!
  const { error } = await db.auth.admin.updateUserById(id, updates)
  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true })
})

export default router
