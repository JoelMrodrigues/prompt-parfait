# Email Templates — Guide de mise en place

5 templates HTML à coller dans le dashboard Supabase.

## Accès

**Supabase Dashboard → Authentication → Email Templates**

---

## 1. Confirmation d'inscription (`confirm-signup.html`)

| Champ        | Valeur                                       |
|--------------|----------------------------------------------|
| **Template** | `Confirm signup`                             |
| **Subject**  | `Confirmez votre compte — Void.pro`          |
| **Body**     | contenu de `confirm-signup.html`             |

Variables : `{{ .ConfirmationURL }}`

---

## 2. Réinitialisation mot de passe (`reset-password.html`)

| Champ        | Valeur                                                   |
|--------------|----------------------------------------------------------|
| **Template** | `Reset password`                                         |
| **Subject**  | `Réinitialisation de votre mot de passe — Void.pro`      |
| **Body**     | contenu de `reset-password.html`                         |

Variables : `{{ .ConfirmationURL }}`

---

## 3. Magic Link (`magic-link.html`)

| Champ        | Valeur                                       |
|--------------|----------------------------------------------|
| **Template** | `Magic Link`                                 |
| **Subject**  | `Votre lien de connexion — Void.pro`         |
| **Body**     | contenu de `magic-link.html`                 |

Variables : `{{ .ConfirmationURL }}`

---

## 4. Changement d'email (`change-email.html`)

| Champ        | Valeur                                                    |
|--------------|-----------------------------------------------------------|
| **Template** | `Change Email Address`                                    |
| **Subject**  | `Confirmez votre nouvelle adresse email — Void.pro`       |
| **Body**     | contenu de `change-email.html`                            |

Variables : `{{ .ConfirmationURL }}` · `{{ .Email }}` · `{{ .NewEmail }}`

---

## 5. Invitation utilisateur (`invite-user.html`)

| Champ        | Valeur                                       |
|--------------|----------------------------------------------|
| **Template** | `Invite User`                                |
| **Subject**  | `Vous êtes invité sur Void.pro`              |
| **Body**     | contenu de `invite-user.html`                |

Variables : `{{ .ConfirmationURL }}`

---

## Page update-password (déjà intégrée dans l'app)

La route `/update-password` existe dans l'app (`src/pages/UpdatePasswordPage.tsx`).
Elle affiche un formulaire avec jauge de force + confirmation, et redirige vers `/` après succès.

---

## Redirect URLs (important)

**Authentication → URL Configuration** :

- **Site URL** : `https://void.pro` (ou domaine Vercel)
- **Redirect URLs** (ajouter) :
  - `https://void.pro/**`
  - `https://*.vercel.app/**`
  - `http://localhost:5173/**`

---

## SMTP custom (recommandé en prod)

Le free tier Supabase est limité à ~3 emails/heure.
**Project Settings → Auth → SMTP Settings** → brancher **Resend** (gratuit jusqu'à 3 000 mails/mois).
