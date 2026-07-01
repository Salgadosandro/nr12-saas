import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useSaveTemplateContent,
  useStandardItems,
  useStandardSections,
  useTemplateSections,
  useTemplates,
} from './hooks'
import type { StandardSection } from './types'

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: allSections } = useStandardSections()
  const { data: templateSections, isLoading: loadingTemplate } = useTemplateSections(id)
  const { data: templates } = useTemplates()
  const saveMut = useSaveTemplateContent(id!)

  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [pendingSelections, setPendingSelections] = useState<Map<string, Set<string>>>(new Map())
  const { data: sectionItems } = useStandardItems(expandedSectionId)

  // Mapa: standard_section_id → Set de standard_item_ids já salvos
  const savedItemsBySectionId = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const ts of templateSections ?? []) {
      map.set(ts.standard_section_id, new Set(ts.standard_item_ids))
    }
    return map
  }, [templateSections])

  const savedSectionIds = useMemo(
    () => new Set((templateSections ?? []).map((s) => s.standard_section_id)),
    [templateSections],
  )

  const template = templates?.find((t) => t.id === id)

  function toggleItem(sectionId: string, itemId: string, checked: boolean) {
    setPendingSelections((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(sectionId) ?? [])
      if (checked) set.add(itemId)
      else set.delete(itemId)
      next.set(sectionId, set)
      return next
    })
  }

  function selectAll(sectionId: string) {
    if (!sectionItems) return
    const saved = savedItemsBySectionId.get(sectionId) ?? new Set()
    const toAdd = sectionItems.filter((i) => !saved.has(i.id)).map((i) => i.id)
    setPendingSelections((prev) => {
      const next = new Map(prev)
      next.set(sectionId, new Set(toAdd))
      return next
    })
  }

  function handleSave() {
    const selections: { sectionId: string; itemIds: string[] }[] = []
    for (const [sectionId, itemSet] of pendingSelections) {
      if (itemSet.size > 0) selections.push({ sectionId, itemIds: Array.from(itemSet) })
    }
    if (selections.length === 0) return
    saveMut.mutate(selections, { onSuccess: () => setPendingSelections(new Map()) })
  }

  const pendingCount = Array.from(pendingSelections.values()).reduce((n, s) => n + s.size, 0)

  const modules = (allSections ?? []).filter((s) => s.section_type === 'module')
  const annexes = (allSections ?? []).filter((s) => s.section_type === 'annex')

  function renderSection(sec: StandardSection) {
    const isExpanded = expandedSectionId === sec.id
    const savedItems = savedItemsBySectionId.get(sec.id) ?? new Set()
    const pending = pendingSelections.get(sec.id) ?? new Set()
    const isSaved = savedSectionIds.has(sec.id)

    return (
      <div key={sec.id} className="border-b border-slate-100 last:border-0">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
          onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">{sec.code}</span>
            <span className="text-sm text-slate-600">{sec.title}</span>
            {isSaved && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {savedItems.size} {t('templates.savedItems')}
              </span>
            )}
            {pending.size > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                +{pending.size} {t('templates.pending')}
              </span>
            )}
          </div>
          <span className="ml-4 shrink-0 text-slate-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isExpanded && (
          <div className="bg-slate-50 px-4 pb-3">
            {!sectionItems ? (
              <p className="py-2 text-sm text-slate-400">{t('common.loading')}</p>
            ) : sectionItems.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">{t('templates.noItems')}</p>
            ) : (
              <>
                <div className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => selectAll(sec.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t('templates.selectAll')}
                  </button>
                  <span className="text-xs text-slate-400">
                    {savedItems.size + pending.size}/{sectionItems.length}{' '}
                    {t('templates.selected')}
                  </span>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {sectionItems.map((item) => {
                    const isSavedItem = savedItems.has(item.id)
                    const isPending = pending.has(item.id)
                    const isChecked = isSavedItem || isPending
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-start gap-2 rounded p-1.5 text-sm ${
                          isChecked ? 'bg-white' : 'hover:bg-white'
                        } ${item.parent_item_id ? 'ml-4' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isSavedItem}
                          onChange={(e) => toggleItem(sec.id, item.id, e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-600">{item.number}</span>
                          <span className="ml-1 text-slate-700">{item.text}</span>
                          {isSavedItem && (
                            <span className="ml-1 text-xs text-green-600">
                              ✓ {t('templates.savedLabel')}
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loadingTemplate) return <p className="text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => navigate('/templates')}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {t('common.back')}
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {template?.name ?? t('templates.editor')}
          </h1>
          {template?.description && (
            <p className="text-sm text-slate-500">{template.description}</p>
          )}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-sm text-amber-800">
            {t('templates.unsavedChanges', { count: pendingCount })}
          </span>
          <button
            onClick={handleSave}
            disabled={saveMut.isPending}
            className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saveMut.isPending ? t('common.saving') : t('templates.saveSelection')}
          </button>
        </div>
      )}

      {saveMut.isSuccess && pendingCount === 0 && (
        <p className="text-sm text-green-600">{t('templates.savedOk')}</p>
      )}

      {allSections === undefined ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : (
        <>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('templates.hint')}
            </p>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">{t('templates.modules')}</h2>
            <div className="rounded border border-slate-200 bg-white text-sm">
              {modules.map(renderSection)}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-600">{t('templates.annexes')}</h2>
            <div className="rounded border border-slate-200 bg-white text-sm">
              {annexes.map(renderSection)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
