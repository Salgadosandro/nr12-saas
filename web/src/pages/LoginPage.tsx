import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher'
import { Logo } from '../components/Logo'

export default function LoginPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // já logado? não faz sentido ficar no /login
  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(t('auth.loginError'))
    else navigate('/')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.email')}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.password')}</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
        </label>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded bg-slate-900 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
          {busy ? t('auth.loading') : t('auth.login')}
        </button>

        <Link to="/forgot-password" className="mt-3 block text-center text-sm text-slate-400 hover:text-slate-700">
          {t('auth.forgotPassword')}
        </Link>
        <Link to="/signup" className="mt-2 block text-center text-sm text-slate-500 hover:text-slate-900">
          {t('auth.noAccount')}
        </Link>
      </form>
    </div>
  )
}
