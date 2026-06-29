import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { Client, ClientInput } from './types'

// Schema de validação (zod). As mensagens são CHAVES de i18n — traduzidas ao
// exibir. CNPJ e e-mail são opcionais (aceitam vazio).
const schema = z.object({
  name: z.string().min(1, 'clients.nameRequired'),
  cnpj: z.string().regex(/^\d{14}$/, 'clients.cnpjInvalid').or(z.literal('')),
  contact_name: z.string(),
  contact_email: z.string().email('clients.emailInvalid').or(z.literal('')),
  contact_phone: z.string(),
})
type FormValues = z.infer<typeof schema>

// '' nos opcionais vira null no banco.
const toNull = (v: string) => (v.trim() === '' ? null : v.trim())

export function ClientForm({
  client,
  onSubmit,
  onCancel,
  saving,
}: {
  client?: Client
  onSubmit: (input: ClientInput) => void
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
      name: client?.name ?? '',
      cnpj: client?.cnpj ?? '',
      contact_name: client?.contact_name ?? '',
      contact_email: client?.contact_email ?? '',
      contact_phone: client?.contact_phone ?? '',
    },
  })

  const submit = handleSubmit((v) =>
    onSubmit({
      name: v.name.trim(),
      cnpj: toNull(v.cnpj),
      contact_name: toNull(v.contact_name),
      contact_email: toNull(v.contact_email),
      contact_phone: toNull(v.contact_phone),
    }),
  )

  const input = 'w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-slate-900'

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-600">{t('clients.name')}</label>
        <input className={input} {...register('name')} />
        {errors.name && <p className="mt-1 text-sm text-red-600">{t(errors.name.message!)}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">{t('clients.cnpj')}</label>
        <input className={input} placeholder={t('clients.cnpjHint')} {...register('cnpj')} />
        {errors.cnpj && <p className="mt-1 text-sm text-red-600">{t(errors.cnpj.message!)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t('clients.contactName')}</label>
          <input className={input} {...register('contact_name')} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t('clients.contactPhone')}</label>
          <input className={input} {...register('contact_phone')} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">{t('clients.contactEmail')}</label>
        <input className={input} {...register('contact_email')} />
        {errors.contact_email && (
          <p className="mt-1 text-sm text-red-600">{t(errors.contact_email.message!)}</p>
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
        <button type="button" onClick={onCancel} className="rounded px-4 py-2 text-slate-600 hover:bg-slate-100">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
