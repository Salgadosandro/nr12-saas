import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'

// As rotas da app:
//  - públicas: /login e /signup
//  - privadas: tudo dentro de <ProtectedRoute> (sem sessão → vai pro /login),
//    renderizadas dentro do <AppLayout> (menu + topo).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<PlaceholderPage titleKey="nav.clients" />} />
          <Route path="/inspections" element={<PlaceholderPage titleKey="nav.inspections" />} />
          <Route path="/reports" element={<PlaceholderPage titleKey="nav.reports" />} />
          <Route path="/billing" element={<PlaceholderPage titleKey="nav.billing" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
