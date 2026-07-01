import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase redireciona com #access_token na URL. O onAuthStateChange
  // detecta o evento PASSWORD_RECOVERY e confirma a sessão.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <Logo />
          <p className="mt-6 text-sm text-slate-400">{t('auth.validatingLink')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-4"
      >
        <div className="mb-2">
          <Logo />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('auth.newPassword')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('auth.newPasswordHint')}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.password')}</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t('auth.confirmPassword')}</span>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password || !confirm}
          className="w-full rounded bg-slate-900 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? t('common.saving') : t('auth.savePassword')}
        </button>
      </form>
    </div>
  )
}
