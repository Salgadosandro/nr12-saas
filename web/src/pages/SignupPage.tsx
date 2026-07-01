import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher'
import { Logo } from '../components/Logo'

export default function SignupPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    // 1) cria o usuário no Auth
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.session) {
      setBusy(false)
      setError(t('auth.signupError'))
      return
    }
    // 2) provisiona a CONTA (tenant) do usuário — o onboarding (create_account
    //    é SECURITY DEFINER e usa auth.uid()). Sem isso, o RLS não deixa criar nada.
    await supabase.rpc('create_account', { account_name: company })
    setBusy(false)
    navigate('/')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LanguageSwitcher />
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.company')}</span>
          <input type="text" required value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.email')}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.password')}</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900" />
        </label>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded bg-slate-900 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
          {busy ? t('auth.loading') : t('auth.signup')}
        </button>

        <Link to="/login" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-900">
          {t('auth.hasAccount')}
        </Link>
      </form>
    </div>
  )
}
