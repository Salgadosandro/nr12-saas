import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const PLAN = {
  name: 'Pro',
  price: 'R$ 297',
  period: '/mês',
  renewal: '30/07/2026',
}

const COMPANY = {
  name: 'Abreu Engenharia e Segurança Ltda.',
  cnpj: '12.345.678/0001-90',
  email: 'admin@abreueng.com.br',
  phone: '+55 (11) 98765-4321',
}

const USAGE = [
  { label: 'Inspeções ativas', value: 12, limit: '—' },
  { label: 'Laudos emitidos', value: 8, limit: '—' },
  { label: 'Consultas à IA', value: 47, limit: 100 },
  { label: 'Membros da equipe', value: 3, limit: 5 },
]

export default function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('account.title')}</h1>

      {/* Dados da empresa */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('account.company')}
          </h2>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {t('account.editSoon')}
          </span>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">{t('clients.name')}</dt>
            <dd className="font-medium text-slate-800">{COMPANY.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('clients.cnpj')}</dt>
            <dd className="font-medium text-slate-800">{COMPANY.cnpj}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('auth.email')}</dt>
            <dd className="font-medium text-slate-800">{COMPANY.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">{t('account.phone')}</dt>
            <dd className="font-medium text-slate-800">{COMPANY.phone}</dd>
          </div>
        </dl>
      </section>

      {/* Plano atual */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('account.plan')}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
              {PLAN.name}
            </span>
            <span className="ml-2 text-2xl font-bold text-slate-900">{PLAN.price}</span>
            <span className="text-slate-500">{PLAN.period}</span>
          </div>
          <div className="ml-auto text-right text-sm text-slate-500">
            <p>{t('account.renewal')}</p>
            <p className="font-medium text-slate-700">{PLAN.renewal}</p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            onClick={() => navigate('/billing')}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t('account.managePlan')} →
          </button>
        </div>
      </section>

      {/* Uso do mês */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('account.usage')}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {USAGE.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.label}</p>
              {item.limit !== '—' && (
                <p className="text-xs text-slate-400">de {item.limit}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Suporte */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('account.support')}
        </h2>
        <p className="mb-4 text-sm text-slate-600">{t('account.supportHint')}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:suporte@relatoriorapido.com.br"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {t('account.contactSupport')}
          </a>
          <a
            href="#"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {t('account.docs')} →
          </a>
        </div>
      </section>
    </div>
  )
}
