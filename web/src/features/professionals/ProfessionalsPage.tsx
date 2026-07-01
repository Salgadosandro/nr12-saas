import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfessionals, useCreateProfessional, useUpdateProfessional } from './hooks'
import { ProfessionalForm } from './ProfessionalForm'
import type { Professional, ProfessionalInput } from './types'

export default function ProfessionalsPage() {
  const { t } = useTranslation()
  const { data: professionals, isLoading } = useProfessionals()
  const createMut = useCreateProfessional()
  const updateMut = useUpdateProfessional()
  const [editing, setEditing] = useState<Professional | 'new' | null>(null)

  function handleSubmit(input: ProfessionalInput) {
    if (editing === 'new') {
      createMut.mutate(input, { onSuccess: () => setEditing(null) })
    } else if (editing) {
      updateMut.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(null) })
    }
  }

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          {editing === 'new' ? t('professionals.new') : t('common.edit')}
        </h1>
        <ProfessionalForm
          professional={editing === 'new' ? undefined : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
          saving={createMut.isPending || updateMut.isPending}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('professionals.title')}</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {t('professionals.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !professionals?.length ? (
        <p className="text-slate-400">{t('professionals.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('professionals.fullName')}</th>
                <th className="px-4 py-2">{t('professionals.crea')}</th>
                <th className="px-4 py-2">{t('professionals.title_field')}</th>
                <th className="px-4 py-2">{t('professionals.cpf')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{p.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{p.crea ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{p.title ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{p.cpf ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      {t('common.edit')}
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
