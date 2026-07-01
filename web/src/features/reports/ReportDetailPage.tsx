import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useGenerateDraft, useGeneratePdf, useReport } from './hooks'
import type { Report } from './types'

const STATUS_CLASSES: Record<Report['status'], string> = {
  draft: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  final: 'bg-green-100 text-green-700',
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useReport(id)
  const draftMut = useGenerateDraft(id!)
  const pdfMut = useGeneratePdf(id!)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  if (isLoading) return <p className="text-slate-400">{t('common.loading')}</p>
  if (isError || !data) return <p className="text-red-500">{t('common.error')}</p>

  const { report, dossier } = data
  const dash = dossier.anexo2_dashboard

  function handleGeneratePdf() {
    pdfMut.mutate(undefined, {
      onSuccess: (result) => setPdfUrl(result.signed_url),
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/reports')}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {report.report_number ?? '—'}
        </h1>
        <span className="text-sm text-slate-400">v{report.version}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[report.status]}`}>
          {t(`reports.st.${report.status}`)}
        </span>
      </div>

      {/* Consolidado */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('reports.summary')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t('reports.total')} value={dash.machines_total} />
          <StatCard label={t('reports.compliant')} value={dash.machines_compliant} />
          <StatCard label={t('reports.na')} value={dash.machines_not_applicable} />
          <StatCard label={t('reports.ncs')} value={dash.nonconformities} />
        </div>
      </section>

      {/* Máquinas */}
      {dossier.anexo1_machines.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('reports.machines')}
          </h2>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full bg-white text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Tag</th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">NR-12</th>
                </tr>
              </thead>
              <tbody>
                {dossier.anexo1_machines.map((m, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{m.tag ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{m.code ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{m.type ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {m.nr_applies === false ? t('reports.na') : '✓'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Não-conformidades */}
      {dossier.anexo3_nonconformities.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('reports.ncs')}
          </h2>
          <ul className="space-y-2">
            {dossier.anexo3_nonconformities.map((nc, i) => (
              <li key={i} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="mr-2 font-medium text-slate-600">{nc.norm_number}</span>
                <span className="text-slate-700">{nc.norm_text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Parecer técnico */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t('reports.parecer')}
        </h2>
        <div className="rounded border border-slate-200 bg-white p-4">
          {report.ai_generated_text ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {report.ai_generated_text}
            </p>
          ) : (
            <p className="text-sm text-slate-400">{t('reports.noParecer')}</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => draftMut.mutate()}
            disabled={draftMut.isPending}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {draftMut.isPending ? t('reports.generatingDraft') : t('reports.generateDraft')}
          </button>

          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('reports.openPdf')}
            </a>
          ) : (
            <button
              onClick={handleGeneratePdf}
              disabled={pdfMut.isPending}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {pdfMut.isPending ? t('reports.generatingPdf') : t('reports.generatePdf')}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded border border-slate-200 bg-white px-4 py-3 text-center">
      <p className="text-2xl font-bold text-slate-900">{value ?? 0}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}
