import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // sempre mostra "enviado" — não revelamos se o email existe
    setSent(true)
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Logo />
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {t('auth.resetEmailSent')}
            </div>
            <Link
              to="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-900"
            >
              ← {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('auth.forgotPassword')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('auth.forgotPasswordHint')}</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-600">{t('auth.email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded bg-slate-900 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('auth.sendReset')}
            </button>
            <Link
              to="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-900"
            >
              ← {t('auth.backToLogin')}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
