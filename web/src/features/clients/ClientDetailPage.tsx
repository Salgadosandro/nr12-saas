import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClient, useLocations, useCreateLocation, useMachinesByClient, useCreateMachine } from './hooks'
import { useMachineTypes, useMachineModels } from '../catalog/hooks'
import { ImportModal } from '../../components/ImportModal'
import { bulkCreateMachines } from './api'
import type { LocationInput, MachineInput, Location } from './types'
import type { MachineType, MachineModel } from '../catalog/types'
import type { ColumnSpec, ParsedRow } from '../../components/ImportModal'

const MACHINE_COLUMNS: ColumnSpec[] = [
  { label: 'TAG',               required: true,  description: 'Identificação da máquina',         example: 'PRE-01' },
  { label: 'Código',            required: true,  description: 'Código interno',                   example: 'MQ-01' },
  { label: 'Código do Local',   required: true,  description: 'Código do local já cadastrado',    example: 'UF-01' },
  { label: 'Fabricante',        required: true,  description: 'Nome do fabricante no catálogo',   example: 'Schuler' },
  { label: 'Código do Modelo',  required: true,  description: 'Código do modelo no catálogo',     example: 'PH-100' },
  { label: 'Nº de Série',       required: false, description: 'Número de série',                  example: 'SN-001' },
  { label: 'Ano de Fabricação', required: false, description: 'Apenas o ano (ex: 2020)',          example: '2020' },
]

function parseMachineRow(
  raw: Record<string, string>,
  locations: Location[],
  models: MachineModel[],
): ParsedRow {
  const errors: string[] = []
  const tag = raw['TAG']?.trim()
  const code = raw['Código']?.trim()
  const locationCode = raw['Código do Local']?.trim()
  const manufacturer = raw['Fabricante']?.trim()
  const modelCode = raw['Código do Modelo']?.trim()

  if (!tag) errors.push('TAG obrigatória')
  if (!code) errors.push('Código obrigatório')

  const location = locations.find((l) => l.code === locationCode)
  if (!location) errors.push(`Local "${locationCode}" não encontrado`)

  const model = models.find(
    (m) => m.manufacturer === manufacturer && m.model_code === modelCode,
  )
  if (!model) errors.push(`Modelo "${manufacturer} / ${modelCode}" não encontrado`)

  const yearStr = raw['Ano de Fabricação']?.trim()
  const year = yearStr ? parseInt(yearStr) : null
  if (yearStr && isNaN(year!)) errors.push('Ano de Fabricação inválido')

  return {
    raw,
    errors,
    data: errors.length ? null : {
      tag,
      code,
      location_id: location!.id,
      machine_model_id: model!.id,
      serial_number: raw['Nº de Série']?.trim() || null,
      manufacture_year: year,
    } satisfies MachineInput,
  }
}

// ── field styles ──────────────────────────────────────────────────────────────

const inp = 'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'
const sel = `${inp} bg-white`

// ── Location inline form ──────────────────────────────────────────────────────

const locSchema = z.object({
  name: z.string().min(1, 'locations.nameRequired'),
  code: z.string().min(1, 'locations.codeRequired'),
  address: z.string(),
})

function LocationForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { t } = useTranslation()
  const createMut = useCreateLocation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(locSchema), defaultValues: { name: '', code: '', address: '' } })

  const submit = handleSubmit(({ name, code, address }) => {
    const input: LocationInput = {
      name: name.trim(),
      code: code.trim(),
      address: address.trim() || null,
    }
    createMut.mutate({ clientId, input }, { onSuccess: () => { reset(); onDone() } })
  })

  return (
    <form onSubmit={submit} className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('locations.name')} *</label>
          <input className={inp} {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name.message!)}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('locations.code')} *</label>
          <input className={inp} {...register('code')} />
          {errors.code && <p className="mt-1 text-xs text-red-600">{t(errors.code.message!)}</p>}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-600">{t('locations.address')}</label>
        <input className={inp} {...register('address')} />
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

// ── Machine inline form ───────────────────────────────────────────────────────

const machSchema = z.object({
  location_id: z.string().min(1, 'machines.locationRequired'),
  machine_model_id: z.string().min(1, 'machines.modelRequired'),
  tag: z.string().min(1, 'machines.tagRequired'),
  code: z.string().min(1, 'machines.codeRequired'),
  serial_number: z.string(),
  manufacture_year: z.string(),
})

function MachineForm({
  clientId,
  onDone,
}: {
  clientId: string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const createMut = useCreateMachine()
  const { data: locations } = useLocations(clientId)
  const { data: types } = useMachineTypes()
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const { data: models } = useMachineModels(selectedTypeId || undefined)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(machSchema),
    defaultValues: {
      location_id: '',
      machine_model_id: '',
      tag: '',
      code: '',
      serial_number: '',
      manufacture_year: '',
    },
  })

  const submit = handleSubmit((v) => {
    const input: MachineInput = {
      location_id: v.location_id,
      machine_model_id: v.machine_model_id,
      tag: v.tag.trim(),
      code: v.code.trim(),
      serial_number: v.serial_number.trim() || null,
      manufacture_year: v.manufacture_year ? parseInt(v.manufacture_year) : null,
    }
    createMut.mutate(input, { onSuccess: () => { reset(); onDone() } })
  })

  return (
    <form onSubmit={submit} className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('locations.title')} *</label>
          <select className={sel} {...register('location_id')}>
            <option value="">— {t('machines.location')} —</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
            ))}
          </select>
          {errors.location_id && <p className="mt-1 text-xs text-red-600">{t(errors.location_id.message!)}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('catalog.machineTypes')}</label>
          <select
            className={sel}
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          >
            <option value="">— {t('catalog.machineTypes')} —</option>
            {types?.map((tp: MachineType) => (
              <option key={tp.id} value={tp.id}>{tp.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-600">{t('machines.model')} *</label>
        <select className={sel} {...register('machine_model_id')}>
          <option value="">— {t('machines.model')} —</option>
          {models?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.manufacturer} — {m.model_code}
            </option>
          ))}
        </select>
        {errors.machine_model_id && (
          <p className="mt-1 text-xs text-red-600">{t(errors.machine_model_id.message!)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('machines.tag')} *</label>
          <input className={inp} {...register('tag')} />
          {errors.tag && <p className="mt-1 text-xs text-red-600">{t(errors.tag.message!)}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('machines.code')} *</label>
          <input className={inp} {...register('code')} />
          {errors.code && <p className="mt-1 text-xs text-red-600">{t(errors.code.message!)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('machines.serialNumber')}</label>
          <input className={inp} {...register('serial_number')} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">{t('machines.manufactureYear')}</label>
          <input className={inp} type="number" placeholder="ex: 2020" {...register('manufacture_year')} />
        </div>
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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const clientId = id!

  const { data: client, isLoading: loadingClient } = useClient(clientId)
  const { data: locations, isLoading: loadingLocs } = useLocations(clientId)
  const { data: machines, isLoading: loadingMachines, refetch: refetchMachines } = useMachinesByClient(clientId)

  const [addingLocation, setAddingLocation] = useState(false)
  const [addingMachine, setAddingMachine] = useState(false)
  const [importingMachines, setImportingMachines] = useState(false)

  const { data: allModels } = useMachineModels()

  if (loadingClient) return <p className="text-slate-400">{t('common.loading')}</p>
  if (!client) return <p className="text-red-500">{t('common.error')}</p>

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/clients')}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
      </div>

      {/* client info */}
      <div className="rounded border border-slate-200 bg-white p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('clients.cnpj')}</dt>
            <dd className="mt-0.5 font-mono text-slate-700">{client.cnpj ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('clients.contactName')}</dt>
            <dd className="mt-0.5 text-slate-700">{client.contact_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('clients.contactPhone')}</dt>
            <dd className="mt-0.5 text-slate-700">{client.contact_phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('clients.contactEmail')}</dt>
            <dd className="mt-0.5 text-slate-700">{client.contact_email ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* ── Locations ── */}
      <section className="rounded border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('locations.title')}
          </h2>
          {!addingLocation && (
            <button
              onClick={() => setAddingLocation(true)}
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              + {t('locations.new')}
            </button>
          )}
        </div>

        {loadingLocs ? (
          <p className="text-sm text-slate-400">{t('common.loading')}</p>
        ) : !locations?.length ? (
          <p className="text-sm text-slate-400">{t('locations.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="pb-2 pr-6">{t('locations.name')}</th>
                  <th className="pb-2 pr-6">{t('locations.code')}</th>
                  <th className="pb-2">{t('locations.address')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td className="py-2 pr-6 font-medium text-slate-700">{loc.name}</td>
                    <td className="py-2 pr-6 font-mono text-slate-500">{loc.code}</td>
                    <td className="py-2 text-slate-500">{loc.address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {addingLocation && (
          <LocationForm clientId={clientId} onDone={() => setAddingLocation(false)} />
        )}
      </section>

      {/* ── Machines ── */}
      <section className="rounded border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {t('machines.title')}
          </h2>
          {!addingMachine && (
            <div className="flex gap-3">
              <button
                onClick={() => setImportingMachines(true)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ↑ {t('import.button')}
              </button>
              <button
                onClick={() => setAddingMachine(true)}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                + {t('machines.new')}
              </button>
            </div>
          )}
        </div>

        {importingMachines && locations && allModels && (
          <ImportModal
            title={t('import.machinesTitle')}
            templateName="modelo_maquinas"
            columns={MACHINE_COLUMNS}
            parse={(raw) => parseMachineRow(raw, locations, allModels)}
            insert={async (rows) => {
              const res = await bulkCreateMachines(rows as MachineInput[])
              refetchMachines()
              return res
            }}
            onClose={() => { setImportingMachines(false) }}
          />
        )}

        {loadingMachines ? (
          <p className="text-sm text-slate-400">{t('common.loading')}</p>
        ) : !machines?.length ? (
          <p className="text-sm text-slate-400">{t('machines.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">{t('machines.tag')}</th>
                  <th className="pb-2 pr-4">{t('machines.code')}</th>
                  <th className="pb-2 pr-4">{t('machines.model')}</th>
                  <th className="pb-2 pr-4">{t('locations.title')}</th>
                  <th className="pb-2 pr-4">{t('machines.serialNumber')}</th>
                  <th className="pb-2">{t('machines.manufactureYear')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machines.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-4 font-mono font-medium text-slate-800">{m.tag}</td>
                    <td className="py-2 pr-4 font-mono text-slate-500">{m.code}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {m.machine_model
                        ? `${m.machine_model.manufacturer} — ${m.machine_model.model_code}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{m.location?.name ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-slate-500">{m.serial_number ?? '—'}</td>
                    <td className="py-2 text-slate-500">{m.manufacture_year ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {addingMachine && (
          <MachineForm clientId={clientId} onDone={() => setAddingMachine(false)} />
        )}
      </section>
    </div>
  )
}
