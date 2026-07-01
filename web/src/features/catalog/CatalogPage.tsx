import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useMachineTypes,
  useCreateMachineType,
  useMachineModels,
  useCreateMachineModel,
} from './hooks'
import type { MachineType } from './types'

// ── inline form schemas ───────────────────────────────────────────────────────

const typeSchema = z.object({ name: z.string().min(1, 'catalog.typeRequired') })
const modelSchema = z.object({
  manufacturer: z.string().min(1, 'catalog.manufacturerRequired'),
  model_code: z.string().min(1, 'catalog.modelCodeRequired'),
})

// ── Type add form ─────────────────────────────────────────────────────────────

function AddTypeForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const createMut = useCreateMachineType()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(typeSchema), defaultValues: { name: '' } })

  const submit = handleSubmit(({ name }) => {
    createMut.mutate({ name: name.trim() }, {
      onSuccess: () => { reset(); onDone() },
    })
  })

  const inp = 'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <div>
        <input className={inp} placeholder={t('catalog.typeName')} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name.message!)}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {createMut.isPending ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" onClick={onDone} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

// ── Model add form ────────────────────────────────────────────────────────────

function AddModelForm({ typeId, onDone }: { typeId: string; onDone: () => void }) {
  const { t } = useTranslation()
  const createMut = useCreateMachineModel()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(modelSchema),
    defaultValues: { manufacturer: '', model_code: '' },
  })

  const submit = handleSubmit(({ manufacturer, model_code }) => {
    createMut.mutate(
      { machine_type_id: typeId, manufacturer: manufacturer.trim(), model_code: model_code.trim() },
      { onSuccess: () => { reset(); onDone() } },
    )
  })

  const inp = 'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <div>
        <input className={inp} placeholder={t('catalog.manufacturer')} {...register('manufacturer')} />
        {errors.manufacturer && <p className="mt-1 text-xs text-red-600">{t(errors.manufacturer.message!)}</p>}
      </div>
      <div>
        <input className={inp} placeholder={t('catalog.modelCode')} {...register('model_code')} />
        {errors.model_code && <p className="mt-1 text-xs text-red-600">{t(errors.model_code.message!)}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {createMut.isPending ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" onClick={onDone} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { t } = useTranslation()
  const { data: types, isLoading: loadingTypes } = useMachineTypes()
  const [selectedType, setSelectedType] = useState<MachineType | null>(null)
  const [addingType, setAddingType] = useState(false)
  const [addingModel, setAddingModel] = useState(false)

  const { data: models, isLoading: loadingModels } = useMachineModels(selectedType?.id)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t('catalog.title')}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Tipos ── */}
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {t('catalog.machineTypes')}
            </h2>
            {!addingType && (
              <button
                onClick={() => setAddingType(true)}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                + {t('catalog.newType')}
              </button>
            )}
          </div>

          {loadingTypes ? (
            <p className="text-sm text-slate-400">{t('common.loading')}</p>
          ) : !types?.length ? (
            <p className="text-sm text-slate-400">{t('catalog.emptyTypes')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {types.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => { setSelectedType(tp); setAddingModel(false) }}
                  className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm transition hover:bg-slate-50 ${
                    selectedType?.id === tp.id ? 'rounded bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  {tp.name}
                  <span className="text-xs text-slate-400">→</span>
                </button>
              ))}
            </div>
          )}

          {addingType && <AddTypeForm onDone={() => setAddingType(false)} />}
        </div>

        {/* ── Modelos ── */}
        <div className="rounded border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {selectedType
                ? `${t('catalog.machineModels')} — ${selectedType.name}`
                : t('catalog.machineModels')}
            </h2>
            {selectedType && !addingModel && (
              <button
                onClick={() => setAddingModel(true)}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                + {t('catalog.newModel')}
              </button>
            )}
          </div>

          {!selectedType ? (
            <p className="text-sm text-slate-400">{t('catalog.selectType')}</p>
          ) : loadingModels ? (
            <p className="text-sm text-slate-400">{t('common.loading')}</p>
          ) : !models?.length ? (
            <p className="text-sm text-slate-400">{t('catalog.emptyModels')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-400">
                  <tr>
                    <th className="pb-2 pr-4">{t('catalog.manufacturer')}</th>
                    <th className="pb-2">{t('catalog.modelCode')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {models.map((m) => (
                    <tr key={m.id}>
                      <td className="py-1.5 pr-4 text-slate-700">{m.manufacturer}</td>
                      <td className="py-1.5 font-mono text-slate-600">{m.model_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedType && addingModel && (
            <AddModelForm typeId={selectedType.id} onDone={() => setAddingModel(false)} />
          )}
        </div>
      </div>
    </div>
  )
}
