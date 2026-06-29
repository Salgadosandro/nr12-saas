import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { LanguageSwitcher } from './LanguageSwitcher'

// Itens do menu. As rotas de clients/inspections/reports/billing ainda são
// placeholders (entram nas próximas fases).
const NAV = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/clients', key: 'nav.clients' },
  { to: '/inspections', key: 'nav.inspections' },
  { to: '/reports', key: 'nav.reports' },
  { to: '/billing', key: 'nav.billing' },
]

// O "casco" das páginas privadas: menu lateral fixo + topo (idioma/sair) +
// <Outlet/> onde cada página é renderizada.
export function AppLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2 text-lg font-bold text-slate-900">
          {t('app.name')}{' '}
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
            {t('app.norm')}
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm transition ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <LanguageSwitcher />
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            {t('auth.logout')}
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
