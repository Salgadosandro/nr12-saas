import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useReports } from './hooks'
import type { Report } from './types'

const STATUS_CLASSES: Record<Report['status'], string> = {
  draft: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  final: 'bg-green-100 text-green-700',
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: reports, isLoading } = useReports()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">{t('reports.title')}</h1>

      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !reports?.length ? (
        <p className="text-slate-400">{t('reports.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('reports.number')}</th>
                <th className="px-4 py-2">{t('reports.version')}</th>
                <th className="px-4 py-2">{t('reports.status')}</th>
                <th className="px-4 py-2">{t('reports.created')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {r.report_number ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500">v{r.version}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[r.status]}`}>
                      {t(`reports.st.${r.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      {t('reports.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
