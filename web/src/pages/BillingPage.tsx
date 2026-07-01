import { useTranslation } from 'react-i18next'

const PLANS = [
  {
    id: 'starter',
    nameKey: 'billing.plans.starter.name',
    price: 'R$ 97',
    period: '/mês',
    features: ['billing.plans.starter.f1', 'billing.plans.starter.f2', 'billing.plans.starter.f3'],
    highlight: false,
  },
  {
    id: 'pro',
    nameKey: 'billing.plans.pro.name',
    price: 'R$ 297',
    period: '/mês',
    features: ['billing.plans.pro.f1', 'billing.plans.pro.f2', 'billing.plans.pro.f3', 'billing.plans.pro.f4'],
    highlight: true,
    current: true,
  },
  {
    id: 'enterprise',
    nameKey: 'billing.plans.enterprise.name',
    price: 'R$ 697',
    period: '/mês',
    features: ['billing.plans.enterprise.f1', 'billing.plans.enterprise.f2', 'billing.plans.enterprise.f3', 'billing.plans.enterprise.f4'],
    highlight: false,
  },
]

const INVOICES = [
  { id: 'INV-2026-06', date: '01/06/2026', amount: 'R$ 297,00', status: 'paid' },
  { id: 'INV-2026-05', date: '01/05/2026', amount: 'R$ 297,00', status: 'paid' },
  { id: 'INV-2026-04', date: '01/04/2026', amount: 'R$ 297,00', status: 'paid' },
]

export default function BillingPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('billing.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('billing.subtitle')}</p>
      </div>

      {/* Plano atual */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              {t('billing.currentPlan')}
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{t('billing.plans.pro.name')}</h2>
            <p className="mt-1 text-slate-600">
              <span className="text-2xl font-black text-slate-900">R$ 297</span>
              <span className="text-sm">/mês</span>
              {' · '}
              <span className="text-sm text-slate-500">
                {t('billing.renewal')}: <strong>01/07/2026</strong>
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              disabled
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60"
            >
              {t('billing.cancelPlan')}
            </button>
            <span className="text-xs text-slate-400">{t('billing.managedByStripe')}</span>
          </div>
        </div>
      </div>

      {/* Comparativo de planos */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{t('billing.comparePlans')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 ${
                plan.highlight
                  ? 'border-teal-500 bg-white shadow-md ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.current && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t('billing.current')}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {t(plan.nameKey)}
              </p>
              <p className="mt-2">
                <span className="text-2xl font-black text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((fk) => (
                  <li key={fk} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 text-teal-500">✓</span>
                    {t(fk)}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.current}
                className={`mt-5 w-full rounded-lg py-2 text-sm font-semibold transition ${
                  plan.current
                    ? 'cursor-default bg-slate-100 text-slate-400'
                    : plan.highlight
                    ? 'bg-slate-900 text-white hover:bg-slate-700'
                    : 'border border-slate-300 text-slate-700 hover:border-slate-900'
                }`}
              >
                {plan.current ? t('billing.current') : t('billing.selectPlan')}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">{t('billing.contactSales')}</p>
      </div>

      {/* Histórico de faturas */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{t('billing.invoices')}</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">{t('billing.invoice')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">{t('billing.date')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">{t('billing.amount')}</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">{t('billing.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.id}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.amount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      {t('billing.paid')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                      {t('billing.download')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Método de pagamento */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{t('billing.paymentMethod')}</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-16 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
            VISA
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">•••• •••• •••• 4242</p>
            <p className="text-xs text-slate-500">{t('billing.expiresAt')} 12/2028</p>
          </div>
          <button
            disabled
            className="ml-auto text-xs text-slate-400 cursor-not-allowed"
          >
            {t('billing.updateCard')}
          </button>
        </div>
      </div>
    </div>
  )
}
