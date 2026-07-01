import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useClients, useCreateClient, useUpdateClient } from './hooks'
import { ClientForm } from './ClientForm'
import type { Client, ClientInput } from './types'

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: clients, isLoading } = useClients()
  const createMut = useCreateClient()
  const updateMut = useUpdateClient()
  const [editing, setEditing] = useState<Client | 'new' | null>(null)

  function handleSubmit(input: ClientInput) {
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
          {editing === 'new' ? t('clients.new') : t('common.edit')}
        </h1>
        <ClientForm
          client={editing === 'new' ? undefined : editing}
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
        <h1 className="text-2xl font-bold text-slate-900">{t('clients.title')}</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {t('clients.new')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !clients?.length ? (
        <p className="text-slate-400">{t('clients.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('clients.name')}</th>
                <th className="px-4 py-2">{t('clients.cnpj')}</th>
                <th className="px-4 py-2">{t('clients.contactName')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2 text-slate-500">{c.cnpj ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{c.contact_name ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="mr-3 text-blue-600 hover:text-blue-800"
                    >
                      {t('clients.view')}
                    </button>
                    <button onClick={() => setEditing(c)} className="text-slate-500 hover:text-slate-900">
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
