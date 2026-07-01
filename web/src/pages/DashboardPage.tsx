import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '../features/dashboard/hooks'
import type { RiskBreakdown, RecentInspection } from '../features/dashboard/api'

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

// ── risk bar ──────────────────────────────────────────────────────────────────

const RISK_META = [
  { key: 'critical' as const, labelKey: 'analysis.risk.critical', bar: 'bg-red-500',    text: 'text-red-700'    },
  { key: 'high'     as const, labelKey: 'analysis.risk.high',     bar: 'bg-orange-400', text: 'text-orange-700' },
  { key: 'medium'   as const, labelKey: 'analysis.risk.medium',   bar: 'bg-amber-400',  text: 'text-amber-700'  },
  { key: 'low'      as const, labelKey: 'analysis.risk.low',      bar: 'bg-green-400',  text: 'text-green-700'  },
]

function RiskBreakdownPanel({ ncByRisk, total }: { ncByRisk: RiskBreakdown; total: number }) {
  const { t } = useTranslation()
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('dashboard.ncByRisk')}
      </h2>
      {total === 0 ? (
        <p className="text-sm text-slate-400">{t('dashboard.noNCs')}</p>
      ) : (
        <div className="space-y-3">
          {RISK_META.map(({ key, labelKey, bar, text }) => {
            const n = ncByRisk[key]
            const pct = total > 0 ? Math.round((n / total) * 100) : 0
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={`font-medium ${text}`}>{t(labelKey)}</span>
                  <span className="text-slate-500">{n}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── recent inspections ────────────────────────────────────────────────────────

function RecentInspectionsPanel({ items }: { items: RecentInspection[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('dashboard.recentInspections')}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{t('inspections.empty')}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((ins) => (
            <button
              key={ins.id}
              onClick={() => navigate(`/inspections/${ins.id}`)}
              className="flex w-full items-center justify-between py-2.5 text-left hover:bg-slate-50 transition-colors px-1 -mx-1 rounded"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{ins.name}</p>
                <p className="text-xs text-slate-400">{ins.client?.name ?? '—'}</p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ins.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {t(`inspections.st.${ins.status}`)}
                </span>
                {ins.performed_on && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(ins.performed_on).toLocaleDateString()}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useDashboardStats()

  if (isLoading || !data) {
    return <p className="text-slate-400">{t('common.loading')}</p>
  }

  const complianceAccent =
    data.complianceRate >= 80
      ? 'text-green-600'
      : data.complianceRate >= 50
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('nav.dashboard')}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t('dashboard.totalInspections')} value={data.totalInspections} />
        <KpiCard
          label={t('dashboard.totalNCs')}
          value={data.totalNCs}
          accent={data.totalNCs > 0 ? 'text-amber-600' : 'text-slate-900'}
        />
        <KpiCard
          label={t('dashboard.criticalNCs')}
          value={data.criticalNCs}
          accent={data.criticalNCs > 0 ? 'text-red-600' : 'text-slate-900'}
        />
        <KpiCard
          label={t('dashboard.complianceRate')}
          value={`${data.complianceRate}%`}
          accent={complianceAccent}
        />
      </div>

      {/* Breakdown + Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RiskBreakdownPanel ncByRisk={data.ncByRisk} total={data.totalNCs} />
        <RecentInspectionsPanel items={data.recentInspections} />
      </div>
    </div>
  )
}
