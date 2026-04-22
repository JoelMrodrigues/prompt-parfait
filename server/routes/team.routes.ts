/**
 * Team routes — invite par email via Resend
 * POST /api/team/invite-email
 */
import { Router, type Request, type Response } from 'express'
import { Resend } from 'resend'

const router = Router()

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// ─── POST /api/team/invite-email ──────────────────────────────────────────────

router.post('/invite-email', async (req: Request, res: Response) => {
  const { email, teamName, inviteLink, senderName } = req.body

  if (!email || !teamName || !inviteLink) {
    return res.status(400).json({ success: false, error: 'email, teamName et inviteLink requis' })
  }

  const resend = getResend()
  if (!resend) {
    return res.status(503).json({ success: false, error: 'RESEND_API_KEY non configurée — envoi impossible' })
  }

  const fromName = senderName ? `${senderName} via Void.pro` : 'Void.pro'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@void.pro'

  const html = buildInviteEmailHtml({ teamName, inviteLink, senderName })

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: `${senderName ? `${senderName} vous invite` : 'Vous êtes invité'} à rejoindre ${teamName} — Void.pro`,
      html,
    })
    if (error) throw new Error(error.message)
    return res.json({ success: true })
  } catch (err: any) {
    console.error('[team/invite-email]', err.message)
    return res.status(500).json({ success: false, error: err.message || "Erreur lors de l'envoi" })
  }
})

// ─── Template HTML ────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildInviteEmailHtml({ teamName, inviteLink, senderName }: {
  teamName: string
  inviteLink: string
  senderName?: string
}) {
  const safeSender = senderName ? escapeHtml(senderName) : ''
  const safeTeam = escapeHtml(teamName)
  const safeLink = encodeURI(inviteLink)

  const senderLine = safeSender
    ? `<strong style="color:#fff">${safeSender}</strong> vous invite à rejoindre`
    : `Vous avez été invité à rejoindre`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invitation équipe — Void.pro</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0a0a12;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;padding:40px 16px;-webkit-font-smoothing:antialiased}
    .wrapper{max-width:560px;margin:0 auto}
    .header{text-align:center;margin-bottom:32px}
    .logo-badge{display:inline-flex;align-items:center;gap:10px;background:#110f1e;border:1px solid #1e1a2e;border-radius:12px;padding:10px 22px}
    .logo-icon{width:28px;height:28px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:8px;display:inline-block}
    .logo-text{font-size:17px;font-weight:700;color:#fff;letter-spacing:-0.4px}
    .logo-text span{color:#a78bfa}
    .card{background:#110f1e;border:1px solid #1e1a2e;border-radius:20px;overflow:hidden}
    .card-accent{height:4px;background:linear-gradient(90deg,#7c3aed 0%,#a855f7 50%,#c084fc 100%)}
    .card-body{padding:40px 40px 36px}
    .icon-wrap{width:64px;height:64px;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.30);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 28px}
    .icon-wrap svg{width:30px;height:30px;color:#a78bfa;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    h1{font-size:24px;font-weight:700;color:#fff;text-align:center;margin-bottom:12px;letter-spacing:-0.4px}
    .subtitle{font-size:15px;color:#94a3b8;text-align:center;line-height:1.6;margin-bottom:28px}
    .team-badge{display:flex;align-items:center;justify-content:center;margin-bottom:32px}
    .team-inner{display:inline-flex;align-items:center;gap:10px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:12px 20px}
    .team-dot{width:10px;height:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50%;flex-shrink:0}
    .team-name{font-size:16px;font-weight:700;color:#c4b5fd;letter-spacing:-0.3px}
    .cta-wrap{text-align:center;margin-bottom:32px}
    .cta-btn{display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff!important;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;letter-spacing:0.1px}
    .expiry{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#64748b;background:#0a0a12;border:1px solid #1e1a2e;border-radius:8px;padding:6px 12px;margin-bottom:20px}
    .divider{height:1px;background:#1e1a2e;margin:28px 0}
    .fallback{background:#0a0a12;border:1px solid #1e1a2e;border-radius:10px;padding:14px 16px}
    .fallback p{font-size:12px;color:#64748b;margin-bottom:6px}
    .fallback a{font-size:12px;color:#a78bfa;word-break:break-all;text-decoration:none}
    .footer{text-align:center;margin-top:28px}
    .footer p{font-size:12px;color:#475569;line-height:1.6}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">
        <span class="logo-icon"></span>
        <span class="logo-text">Void<span>.pro</span></span>
      </div>
    </div>
    <div class="card">
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <h1>Invitation à rejoindre une équipe</h1>
        <p class="subtitle">${senderLine}</p>
        <div class="team-badge">
          <div class="team-inner">
            <span class="team-dot"></span>
            <span class="team-name">${safeTeam}</span>
          </div>
        </div>
        <div class="cta-wrap">
          <span class="expiry">⏱ Lien valable 7 jours</span><br/>
          <a href="${safeLink}" class="cta-btn">Rejoindre l'équipe</a>
        </div>
        <div class="divider"></div>
        <div class="fallback">
          <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <a href="${safeLink}">${escapeHtml(inviteLink)}</a>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Si vous ne souhaitez pas rejoindre cette équipe, ignorez simplement cet email.</p>
    </div>
  </div>
</body>
</html>`
}

export default router
