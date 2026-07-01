/**
 * ImportModal — modal genérico de importação Excel/CSV.
 *
 * Quem usa fornece:
 *  - columns: especificação das colunas (label = nome exato na planilha)
 *  - parse:   valida 1 linha bruta e retorna { data, errors }
 *  - insert:  recebe as linhas válidas e faz o bulk-insert no Supabase
 */
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'

// ── tipos públicos ─────────────────────────────────────────────────────────

export type ColumnSpec = {
  label: string       // nome exato que o usuário deve usar na planilha
  required: boolean
  description: string // dica curta (ex: "14 dígitos, só números")
  example: string     // valor de exemplo para o template
}

export type ParsedRow = {
  raw: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | null   // null = linha inválida
  errors: string[]
}

export type ImportModalProps = {
  title: string
  templateName: string  // "modelo_clientes"  → baixa como modelo_clientes.xlsx
  columns: ColumnSpec[]
  parse: (raw: Record<string, string>) => ParsedRow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (rows: Record<string, any>[]) => Promise<{ ok: number; failed: number }>
  onClose: () => void
}

// ── helpers ────────────────────────────────────────────────────────────────

function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        // normalise values to string
        const rows = json.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [String(k).trim(), String(v ?? '').trim()]),
          ),
        )
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function downloadTemplate(name: string, columns: ColumnSpec[]) {
  const headers = columns.map((c) => c.label)
  const examples = columns.map((c) => c.example)
  const ws = XLSX.utils.aoa_to_sheet([headers, examples])

  // Style header row (bold) — basic styling supported by xlsx
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[addr]) ws[addr] = {}
    ws[addr].s = { font: { bold: true } }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, `${name}.xlsx`)
}

// ── component ──────────────────────────────────────────────────────────────

type Phase = 'guide' | 'preview' | 'done'

export function ImportModal({
  title,
  templateName,
  columns,
  parse,
  insert,
  onClose,
}: ImportModalProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('guide')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null)

  const validRows = rows.filter((r) => r.errors.length === 0)
  const invalidRows = rows.filter((r) => r.errors.length > 0)

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const rawRows = await parseFile(file)
      const parsed = rawRows.map(parse)
      setRows(parsed)
      setPhase('preview')
    } catch {
      alert(t('import.parseError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await insert(validRows.map((r) => r.data!))
      setResult(res)
      setPhase('done')
    } catch {
      alert(t('import.insertError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">

          {/* ── phase: guide ── */}
          {phase === 'guide' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{t('import.guideLead')}</p>

              {/* column spec table */}
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{t('import.colHeader')}</th>
                      <th className="px-3 py-2">{t('import.colRequired')}</th>
                      <th className="px-3 py-2">{t('import.colDesc')}</th>
                      <th className="px-3 py-2">{t('import.colExample')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {columns.map((col) => (
                      <tr key={col.label}>
                        <td className="px-3 py-2 font-mono font-medium text-slate-800">
                          {col.label}
                        </td>
                        <td className="px-3 py-2">
                          {col.required ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              {t('import.required')}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{t('import.optional')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{col.description}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {col.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-400">{t('import.caseNote')}</p>

              {/* actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => downloadTemplate(templateName, columns)}
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ↓ {t('import.downloadTemplate')}
                </button>

                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('import.chooseFile')}
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          )}

          {/* ── phase: preview ── */}
          {phase === 'preview' && (
            <div className="space-y-4">
              {/* summary */}
              <div className="flex gap-4 text-sm">
                <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
                  ✓ {validRows.length} {t('import.valid')}
                </span>
                {invalidRows.length > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
                    ✗ {invalidRows.length} {t('import.invalid')}
                  </span>
                )}
              </div>

              {/* preview table — first 10 rows */}
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-slate-400">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {columns.map((c) => (
                        <th key={c.label} className="px-3 py-2">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2">{t('import.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={row.errors.length ? 'bg-red-50' : ''}
                      >
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        {columns.map((c) => (
                          <td key={c.label} className="px-3 py-1.5 text-slate-700">
                            {row.raw[c.label] || '—'}
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          {row.errors.length ? (
                            <span className="text-red-600" title={row.errors.join(' | ')}>
                              ✗ {row.errors[0]}
                            </span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > 10 && (
                <p className="text-xs text-slate-400">
                  {t('import.moreRows', { count: rows.length - 10 })}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={loading || validRows.length === 0}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {loading
                    ? t('common.saving')
                    : t('import.confirmBtn', { count: validRows.length })}
                </button>
                <button
                  onClick={() => { setRows([]); setPhase('guide') }}
                  className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t('import.chooseAnother')}
                </button>
              </div>
            </div>
          )}

          {/* ── phase: done ── */}
          {phase === 'done' && result && (
            <div className="space-y-4 py-4 text-center">
              <p className="text-4xl">✅</p>
              <p className="text-lg font-semibold text-slate-900">
                {t('import.doneTitle', { ok: result.ok })}
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-red-600">
                  {t('import.doneFailed', { count: result.failed })}
                </p>
              )}
              <button
                onClick={onClose}
                className="rounded bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {t('import.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
