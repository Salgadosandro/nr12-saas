import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useInspections, useCreateInspection } from './hooks'
import { InspectionForm } from './InspectionForm'
import type { Inspection, InspectionInput } from './types'

const STATUS_CLASSES: Record<Inspection['status'], string> = {
  in_field: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

type StatusFilter = 'all' | Inspection['status']

export default function InspectionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: inspections, isLoading } = useInspections()
  const createMut = useCreateInspection()
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    if (!inspections) return []
    return inspections.filter((insp) => {
      const matchStatus = statusFilter === 'all' || insp.status === statusFilter
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        insp.name.toLowerCase().includes(q) ||
        (insp.client?.name ?? '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [inspections, search, statusFilter])

  function handleSubmit(input: InspectionInput) {
    createMut.mutate(input, { onSuccess: () => setCreating(false) })
  }

  if (creating) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">{t('inspections.new')}</h1>
        <InspectionForm
          onSubmit={handleSubmit}
          onCancel={() => setCreating(false)}
          saving={createMut.isPending}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('inspections.title')}</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {t('inspections.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('inspections.search')}
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-600"
        />
        <div className="flex gap-1">
          {(['all', 'in_field', 'completed'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? t('common.all') : t(`inspections.st.${st}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !filtered.length ? (
        <p className="text-slate-400">
          {search || statusFilter !== 'all' ? t('inspections.noResults') : t('inspections.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('inspections.name')}</th>
                <th className="px-4 py-2">{t('inspections.client')}</th>
                <th className="px-4 py-2">{t('inspections.date')}</th>
                <th className="px-4 py-2">{t('inspections.status')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((insp) => (
                <tr
                  key={insp.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                >
                  <td className="px-4 py-2 font-medium text-slate-800">{insp.name}</td>
                  <td className="px-4 py-2 text-slate-500">{insp.client?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {insp.performed_on
                      ? new Date(insp.performed_on).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[insp.status]}`}>
                      {t(`inspections.st.${insp.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-slate-400 hover:text-slate-900">
                      {t('inspections.view')} →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
            {filtered.length} {t('inspections.results', { count: filtered.length })}
          </div>
        </div>
      )}
    </div>
  )
}
