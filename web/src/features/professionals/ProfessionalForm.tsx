import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { Professional, ProfessionalInput } from './types'

const schema = z.object({
  full_name: z.string().min(1, 'professionals.fullNameRequired'),
  crea: z.string(),
  title: z.string(),
  cpf: z.string().regex(/^\d{11}$/, 'professionals.cpfInvalid').or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

const toNull = (v: string) => (v.trim() === '' ? null : v.trim())

export function ProfessionalForm({
  professional,
  onSubmit,
  onCancel,
  saving,
}: {
  professional?: Professional
  onSubmit: (input: ProfessionalInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: professional?.full_name ?? '',
      crea: professional?.crea ?? '',
      title: professional?.title ?? '',
      cpf: professional?.cpf ?? '',
    },
  })

  const submit = handleSubmit((v) =>
    onSubmit({
      full_name: v.full_name.trim(),
      crea: toNull(v.crea),
      title: toNull(v.title),
      cpf: toNull(v.cpf),
    }),
  )

  const input =
    'w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900'

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-600">
          {t('professionals.fullName')} *
        </label>
        <input className={input} {...register('full_name')} />
        {errors.full_name && (
          <p className="mt-1 text-sm text-red-600">{t(errors.full_name.message!)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t('professionals.crea')}</label>
          <input className={input} {...register('crea')} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t('professionals.title_field')}</label>
          <input className={input} {...register('title')} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">{t('professionals.cpf')}</label>
        <input className={input} placeholder="11 dígitos" {...register('cpf')} />
        {errors.cpf && (
          <p className="mt-1 text-sm text-red-600">{t(errors.cpf.message!)}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-4 py-2 text-slate-600 hover:bg-slate-100"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
