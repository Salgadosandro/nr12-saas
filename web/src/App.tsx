import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import BillingPage from './pages/BillingPage'
import TeamPage from './features/team/TeamPage'
import ClientsPage from './features/clients/ClientsPage'
import ClientDetailPage from './features/clients/ClientDetailPage'
import ProfessionalsPage from './features/professionals/ProfessionalsPage'
import CatalogPage from './features/catalog/CatalogPage'
import ReportsPage from './features/reports/ReportsPage'
import ReportDetailPage from './features/reports/ReportDetailPage'
import InspectionsPage from './features/inspections/InspectionsPage'
import InspectionDetailPage from './features/inspections/InspectionDetailPage'
import AnalysisPage from './features/analysis/AnalysisPage'
import TemplatesPage from './features/templates/TemplatesPage'
import TemplateEditorPage from './features/templates/TemplateEditorPage'
import AccountPage from './pages/AccountPage'

// As rotas da app:
//  - públicas: /login e /signup
//  - privadas: tudo dentro de <ProtectedRoute> (sem sessão → vai pro /login),
//    renderizadas dentro do <AppLayout> (menu + topo).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/professionals" element={<ProfessionalsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/analysis/:checklistId" element={<AnalysisPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:id" element={<TemplateEditorPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
