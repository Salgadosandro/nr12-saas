import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useClients } from '../clients/hooks'
import type { InspectionInput } from './types'

const schema = z.object({
  name: z.string().min(1, 'nameRequired'),
  client_id: z.string().min(1, 'clientRequired'),
  performed_on: z.string().nullable(),
  notes: z.string().nullable(),
})

type Props = {
  onSubmit: (input: InspectionInput) => void
  onCancel: () => void
  saving: boolean
}

export function InspectionForm({ onSubmit, onCancel, saving }: Props) {
  const { t } = useTranslation()
  const { data: clients } = useClients()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InspectionInput>({
    resolver: zodResolver(schema),
    defaultValues: { performed_on: null, notes: null },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t('inspections.name')}
        </label>
        <input
          {...register('name')}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{t(`inspections.${errors.name.message}`)}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t('inspections.client')}
        </label>
        <select
          {...register('client_id')}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">— {t('inspections.clientRequired')} —</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.client_id && (
          <p className="mt-1 text-xs text-red-500">{t(`inspections.${errors.client_id.message}`)}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t('inspections.date')}
        </label>
        <input
          type="date"
          {...register('performed_on')}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {t('inspections.notes')}
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
