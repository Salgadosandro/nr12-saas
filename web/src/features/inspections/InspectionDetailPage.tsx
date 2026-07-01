import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useInspection, useCreateReport, useCreateChecklist, useUpdateInspectionStatus } from './hooks'
import { useMachinesByClient } from '../clients/hooks'
import { useTemplates } from '../templates/hooks'
import type { Inspection } from './types'

const STATUS_CLASSES: Record<Inspection['status'], string> = {
  in_field: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
}

// ── Modal: adicionar máquina à inspeção ───────────────────────────────────────

type AddChecklistModalProps = {
  inspectionId: string
  clientId: string
  onClose: () => void
}

function AddChecklistModal({ inspectionId, clientId, onClose }: AddChecklistModalProps) {
  const { t } = useTranslation()
  const { data: machines } = useMachinesByClient(clientId)
  const { data: templates } = useTemplates()
  const addMut = useCreateChecklist(inspectionId)

  const [machineId, setMachineId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [nrApplies, setNrApplies] = useState(true)
  const [exclusionCode, setExclusionCode] = useState('')
  const [exclusionNotes, setExclusionNotes] = useState('')

  const canSubmit = !!machineId && !!templateId && (nrApplies || !!exclusionCode)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addMut.mutate(
      {
        machineId,
        templateId,
        nrApplies,
        exclusionCode: nrApplies ? null : exclusionCode || null,
        exclusionNotes: nrApplies ? null : exclusionNotes || null,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{t('inspections.addMachine')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção de máquina */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t('inspections.machine')} *
            </label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t('inspections.selectMachine')}</option>
              {machines?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tag} — {m.code}
                  {m.location ? ` (${m.location.name})` : ''}
                </option>
              ))}
            </select>
            {machines?.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">{t('inspections.noMachinesForClient')}</p>
            )}
          </div>

          {/* Toggle NR não se aplica */}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={!nrApplies}
              onChange={(e) => setNrApplies(!e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">{t('inspections.nrNotApplicable')}</span>
          </label>

          {/* Campos de exclusão (quando NR não se aplica) */}
          {!nrApplies && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('inspections.exclusionCode')} *
                </label>
                <input
                  type="text"
                  value={exclusionCode}
                  onChange={(e) => setExclusionCode(e.target.value)}
                  placeholder="ex.: 12.1.4.c"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
                {!exclusionCode && (
                  <p className="mt-1 text-xs text-red-400">
                    {t('inspections.exclusionCodeRequired')}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('inspections.exclusionNotes')}
                </label>
                <input
                  type="text"
                  value={exclusionNotes}
                  onChange={(e) => setExclusionNotes(e.target.value)}
                  placeholder="ex.: Certificado INMETRO nº 12345"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {/* Seleção de template */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t('inspections.template')} *
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t('inspections.selectTemplate')}</option>
              {templates?.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
            {templates?.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">{t('inspections.noTemplates')}</p>
            )}
          </div>

          {addMut.isError && <p className="text-sm text-red-500">{t('common.error')}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={addMut.isPending || !canSubmit}
              className="flex-1 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {addMut.isPending ? t('common.saving') : t('inspections.addMachineBtn')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: insp, isLoading, isError } = useInspection(id)
  const reportMut = useCreateReport(id!)
  const statusMut = useUpdateInspectionStatus(id!)
  const [showAddModal, setShowAddModal] = useState(false)

  if (isLoading) return <p className="text-slate-400">{t('common.loading')}</p>
  if (isError || !insp) return <p className="text-red-500">{t('common.error')}</p>

  function handleGenerateReport() {
    reportMut.mutate(undefined, {
      onSuccess: (report) => navigate(`/reports/${report.id}`),
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate('/inspections')}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{insp.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[insp.status]}`}>
          {t(`inspections.st.${insp.status}`)}
        </span>
        {insp.status === 'in_field' && (
          <button
            onClick={() => statusMut.mutate('completed')}
            disabled={statusMut.isPending}
            className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {statusMut.isPending ? t('inspections.completing') : t('inspections.markCompleted')}
          </button>
        )}
        {insp.status === 'completed' && (
          <button
            onClick={() => statusMut.mutate('in_field')}
            disabled={statusMut.isPending}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {statusMut.isPending ? t('inspections.completing') : t('inspections.reopen')}
          </button>
        )}
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-2 gap-4 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-400">{t('inspections.client')}</p>
          <p className="font-medium text-slate-800">{insp.client?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">{t('inspections.date')}</p>
          <p className="font-medium text-slate-800">
            {insp.performed_on ? new Date(insp.performed_on).toLocaleDateString() : '—'}
          </p>
        </div>
        {insp.notes && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400">{t('inspections.notes')}</p>
            <p className="text-slate-700">{insp.notes}</p>
          </div>
        )}
      </div>

      {/* Checklists / máquinas */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('inspections.checklists')}
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            + {t('inspections.addMachine')}
          </button>
        </div>
        {!insp.checklists?.length ? (
          <p className="text-sm text-slate-400">{t('inspections.noChecklists')}</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full bg-white text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2">Tag</th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {insp.checklists.map((cl) => (
                  <tr key={cl.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {cl.machine?.tag ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{cl.machine?.code ?? '—'}</td>
                    <td className="px-4 py-2">
                      {cl.status === 'completed' ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Concluído
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Em andamento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => navigate(`/analysis/${cl.id}`)}
                        className="text-slate-500 hover:text-slate-900 text-sm"
                      >
                        {t('inspections.analyse')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ação: gerar laudo */}
      <section className="border-t border-slate-200 pt-4">
        <button
          onClick={handleGenerateReport}
          disabled={reportMut.isPending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {reportMut.isPending
            ? t('inspections.generatingReport')
            : t('inspections.generateReport')}
        </button>
        {reportMut.isError && (
          <p className="mt-2 text-sm text-red-500">{t('common.error')}</p>
        )}
      </section>

      {/* Modal de adicionar máquina */}
      {showAddModal && (
        <AddChecklistModal
          inspectionId={insp.id}
          clientId={insp.client_id}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
