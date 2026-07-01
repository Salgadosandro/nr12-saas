import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useTemplates, useCreateTemplate } from './hooks'
import type { TemplateInput } from './types'

export default function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: templates, isLoading } = useTemplates()
  const createMut = useCreateTemplate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const input: TemplateInput = {
      name: name.trim(),
      description: description.trim() || null,
    }
    createMut.mutate(input, {
      onSuccess: (tpl) => {
        setCreating(false)
        setName('')
        setDescription('')
        navigate(`/templates/${tpl.id}`)
      },
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('templates.title')}</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {t('templates.new')}
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-3 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold text-slate-800">{t('templates.new')}</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t('templates.name')} *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              placeholder={t('templates.namePlaceholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {t('templates.description')}
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              placeholder={t('templates.descriptionHint')}
            />
          </div>
          {createMut.isError && (
            <p className="text-sm text-red-500">{t('common.error')}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMut.isPending || !name.trim()}
              className="rounded bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {createMut.isPending ? t('common.saving') : t('templates.createAndEdit')}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : !templates?.length ? (
        <p className="text-slate-400">{t('templates.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('templates.name')}</th>
                <th className="px-4 py-2">{t('templates.description')}</th>
                <th className="px-4 py-2">{t('templates.createdAt')}</th>
                <th className="px-4 py-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{tpl.name}</td>
                  <td className="px-4 py-2 text-slate-500">{tpl.description ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(tpl.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => navigate(`/templates/${tpl.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {t('templates.edit')}
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
