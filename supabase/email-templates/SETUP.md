# Email Templates — Guide de mise en place

Deux templates HTML à coller dans le dashboard Supabase.

## Accès

**Supabase Dashboard → Authentication → Email Templates**

---

## 1. Confirmation d'inscription (`confirm-signup.html`)

| Champ         | Valeur                                        |
|---------------|-----------------------------------------------|
| **Template**  | `Confirm signup`                              |
| **Subject**   | `Confirmez votre compte — LoL Draft Pro`      |
| **Body**      | contenu de `confirm-signup.html`              |

**Variable utilisée :** `{{ .ConfirmationURL }}` — générée automatiquement par Supabase.

---

## 2. Réinitialisation mot de passe (`reset-password.html`)

| Champ         | Valeur                                              |
|---------------|-----------------------------------------------------|
| **Template**  | `Reset password`                                    |
| **Subject**   | `Réinitialisation de votre mot de passe — LoL Draft Pro` |
| **Body**      | contenu de `reset-password.html`                    |

**Variable utilisée :** `{{ .ConfirmationURL }}` — générée automatiquement par Supabase.

---

## Redirect URL (important)

Dans **Authentication → URL Configuration** :

- **Site URL** : `https://ton-domaine.vercel.app`
- **Redirect URLs** (ajouter) :
  - `https://ton-domaine.vercel.app/**`
  - `http://localhost:5173/**` (dev local)

Le reset password redirige vers `/update-password` (déjà configuré dans `ProfilePage`).

---

## SMTP custom (optionnel mais recommandé)

Par défaut Supabase utilise son propre SMTP (limité à ~3 emails/heure en free tier).
Pour la prod, configurer un SMTP custom dans **Project Settings → Auth → SMTP Settings** :

- **Resend** (recommandé) : gratuit jusqu'à 3 000 mails/mois
- **SendGrid** ou **Postmark** : alternatives

Avec Resend, la clé API se configure directement dans Supabase sans aucun code supplémentaire.
