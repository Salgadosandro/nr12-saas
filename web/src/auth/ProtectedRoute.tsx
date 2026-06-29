import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'

// "Trava" das rotas privadas: enquanto carrega, espera; sem sessão, manda pro
// /login; com sessão, renderiza a rota filha (<Outlet/>).
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-400">{t('auth.loading')}</div>
  }
  return session ? <Outlet /> : <Navigate to="/login" replace />
}
