import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'

// Tela mínima da Fase 0: prova que Tailwind, i18n e o cliente Supabase funcionam.
// Será substituída pelo roteamento real (login, dashboard...) na Fase 1.
export default function App() {
  const { t, i18n } = useTranslation()
  const [conexao, setConexao] = useState<'…' | 'ok' | 'erro'>('…')

  useEffect(() => {
    // ping simples: se o cliente fala com o Supabase, a sessão resolve sem throw
    supabase.auth.getSession()
      .then(() => setConexao('ok'))
      .catch(() => setConexao('erro'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 text-slate-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">{t('app.name')}</h1>
        <p className="mt-2 text-slate-500">{t('tagline')}</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{t('language')}:</span>
        {(['pt', 'en'] as const).map((lng) => (
          <button
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            className={`px-3 py-1 rounded border transition ${
              i18n.resolvedLanguage === lng
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-300 hover:bg-slate-100'
            }`}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="text-sm text-slate-500">
        Supabase:{' '}
        <span className={conexao === 'ok' ? 'text-green-600' : conexao === 'erro' ? 'text-red-600' : ''}>
          {conexao === 'ok' ? '✓ conectado' : conexao === 'erro' ? '✗ erro' : '…'}
        </span>
      </div>
    </div>
  )
}
