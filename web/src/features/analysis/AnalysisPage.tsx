import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useAnalysis,
  useCommonPlans,
  useRatingSuggestion,
  useSuggestPlan,
  useUpdateRating,
  useUpsertActionPlan,
} from './hooks'
import { RISK_COLORS, RISK_MATRIX } from './types'
import type { Answer, AnswerPhoto, Probability, RiskLevel, Severity } from './types'

type EditState = {
  probability: Probability | ''
  severity: Severity | ''
  description: string
  responsible_name: string
  due_date: string
}

// ── per-NC card ────────────────────────────────────────────────────────────────
// Extracted as a component so useCommonProblems / useRatingSuggestion can be
// called per item (hooks may not be used inside loops).

type NCCardProps = {
  ans: Answer
  edit: EditState
  onFieldChange: (field: keyof EditState, value: string) => void
  onSaveRating: () => void
  onSavePlan: () => void
  onSuggest: () => void
  isSuggesting: boolean
  ratingPending: boolean
  planPending: boolean
}

function NCCard({
  ans,
  edit,
  onFieldChange,
  onSaveRating,
  onSavePlan,
  onSuggest,
  isSuggesting,
  ratingPending,
  planPending,
}: NCCardProps) {
  const { t } = useTranslation()
  const item = ans.checklist_template_item?.standard_item
  const photos: AnswerPhoto[] = ans.photos ?? []

  const { data: commonPlans } = useCommonPlans(item?.number)
  const { data: ratingSug } = useRatingSuggestion(item?.number)

  const PLANS_VISIBLE = 5
  const [plansExpanded, setPlansExpanded] = useState(false)
  const plans = commonPlans?.plans ?? []
  const visiblePlans = plansExpanded ? plans : plans.slice(0, PLANS_VISIBLE)
  const hasMore = plans.length > PLANS_VISIBLE

  const risk: RiskLevel | null =
    edit.probability && edit.severity
      ? RISK_MATRIX[edit.probability as Probability][edit.severity as Severity]
      : null

  // helpers to render historical rating distributions
  function HistHint({ entries }: { entries: { value: string; pct: number; label: string }[] }) {
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {entries.map((e) => (
          <span
            key={e.value}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
          >
            {e.label} {e.pct}%
          </span>
        ))}
      </div>
    )
  }

  const freqEntries =
    ratingSug?.sufficient
      ? ratingSug.frequencia.map((f) => ({
          value: f.value,
          pct: f.pct,
          label: t(`analysis.prob.${f.value}`),
        }))
      : []

  const gravEntries =
    ratingSug?.sufficient
      ? ratingSug.gravidade.map((g) => ({
          value: g.value,
          pct: g.pct,
          label: t(`analysis.sev.${g.value}`),
        }))
      : []

  return (
    <div className="space-y-4 rounded border border-slate-200 bg-white p-5">
      {/* Item da norma */}
      <div>
        <span className="font-mono text-sm font-bold text-slate-700">{item?.number}</span>
        <p className="mt-1 text-sm text-slate-600 line-clamp-3">{item?.text}</p>
      </div>

      {/* Justificativa do inspetor */}
      {ans.justification && (
        <div className="rounded bg-slate-50 p-3">
          <p className="mb-1 text-xs font-medium text-slate-400">{t('analysis.justification')}</p>
          <p className="text-sm text-slate-700">{ans.justification}</p>
        </div>
      )}

      {/* Fotos da NC */}
      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">{t('analysis.photos')}</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) =>
              photo.signed_url ? (
                <a
                  key={photo.id}
                  href={photo.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={photo.signed_url}
                    alt={`Foto ${photo.position}`}
                    className="h-24 w-24 rounded border border-slate-200 object-cover hover:opacity-80 transition-opacity"
                  />
                </a>
              ) : null,
            )}
          </div>
        </div>
      )}

      {/* Avaliação de risco */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {t('analysis.probability')}
            </label>
            <select
              value={edit.probability}
              onChange={(e) => onFieldChange('probability', e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">—</option>
              <option value="low">{t('analysis.prob.low')}</option>
              <option value="medium">{t('analysis.prob.medium')}</option>
              <option value="high">{t('analysis.prob.high')}</option>
            </select>
            {freqEntries.length > 0 && <HistHint entries={freqEntries} />}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {t('analysis.severity')}
            </label>
            <select
              value={edit.severity}
              onChange={(e) => onFieldChange('severity', e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">—</option>
              <option value="minor">{t('analysis.sev.minor')}</option>
              <option value="moderate">{t('analysis.sev.moderate')}</option>
              <option value="major">{t('analysis.sev.major')}</option>
            </select>
            {gravEntries.length > 0 && <HistHint entries={gravEntries} />}
          </div>
          {risk && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${RISK_COLORS[risk]}`}>
              {t(`analysis.risk.${risk}`)}
            </span>
          )}
          <button
            onClick={onSaveRating}
            disabled={!edit.probability || !edit.severity || ratingPending}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {t('analysis.saveRating')}
          </button>
        </div>
      </div>

      {/* Plano de ação */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('analysis.actionPlan')}
        </p>

        {/* Chips de planos de ação típicos */}
        {plans.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-slate-400">{t('analysis.commonPlans')}</p>
            <div className="flex flex-wrap gap-1.5">
              {visiblePlans.map((plan, i) => (
                <button
                  key={i}
                  onClick={() => onFieldChange('description', plan.plan_text)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                >
                  {plan.plan_text}
                  <span className="ml-1 text-slate-400">×{plan.vezes}</span>
                </button>
              ))}
              {hasMore && (
                <button
                  onClick={() => setPlansExpanded((v) => !v)}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  {plansExpanded
                    ? t('analysis.plansCollapse')
                    : t('analysis.plansExpand', { count: plans.length - PLANS_VISIBLE })}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            rows={3}
            value={edit.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder={t('analysis.description')}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            onClick={onSuggest}
            disabled={!ans.justification || isSuggesting}
            className="absolute right-2 top-2 rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 disabled:opacity-40"
          >
            {isSuggesting ? t('analysis.suggesting') : t('analysis.suggestAI')}
          </button>
        </div>
        <div className="flex gap-3">
          <input
            value={edit.responsible_name}
            onChange={(e) => onFieldChange('responsible_name', e.target.value)}
            placeholder={t('analysis.responsible')}
            className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none"
          />
          <input
            type="date"
            value={edit.due_date}
            onChange={(e) => onFieldChange('due_date', e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <button
          onClick={onSavePlan}
          disabled={!edit.description || planPending}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {t('analysis.savePlan')}
        </button>
      </div>
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useAnalysis(checklistId)
  const ratingMut = useUpdateRating(checklistId!)
  const planMut = useUpsertActionPlan(checklistId!)
  const suggestMut = useSuggestPlan()

  const [edit, setEdit] = useState<Record<string, EditState>>({})
  const [suggestingId, setSuggestingId] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const init: Record<string, EditState> = {}
    for (const ans of data.answers) {
      const plan = ans.action_plans?.[0]
      init[ans.id] = {
        probability: (ans.probability as Probability) ?? '',
        severity: (ans.severity as Severity) ?? '',
        description: plan?.description ?? '',
        responsible_name: plan?.responsible_name ?? '',
        due_date: plan?.due_date ?? '',
      }
    }
    setEdit(init)
  }, [data])

  if (isLoading) return <p className="text-slate-400">{t('common.loading')}</p>
  if (isError || !data) return <p className="text-red-500">{t('common.error')}</p>

  const { checklist, answers } = data

  function updateField(answerId: string, field: keyof EditState, value: string) {
    setEdit((prev) => ({ ...prev, [answerId]: { ...prev[answerId], [field]: value } }))
  }

  function handleSaveRating(answerId: string) {
    const s = edit[answerId]
    if (!s?.probability || !s?.severity) return
    const risk_level = RISK_MATRIX[s.probability as Probability][s.severity as Severity]
    ratingMut.mutate({
      answerId,
      probability: s.probability as Probability,
      severity: s.severity as Severity,
      risk_level,
    })
  }

  function handleSavePlan(answerId: string) {
    const s = edit[answerId]
    planMut.mutate({
      answer_id: answerId,
      description: s?.description ?? '',
      responsible_name: s?.responsible_name || null,
      due_date: s?.due_date || null,
    })
  }

  function handleSuggest(answerId: string) {
    const ans = answers.find((a) => a.id === answerId)
    if (!ans?.justification) return
    const itemNumber = ans.checklist_template_item?.standard_item?.number
    setSuggestingId(answerId)
    suggestMut.mutate(
      { text: ans.justification, standard_item_number: itemNumber },
      {
        onSuccess: (res) => {
          if (res.suggested_plan) updateField(answerId, 'description', res.suggested_plan)
          setSuggestingId(null)
        },
        onError: () => setSuggestingId(null),
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate(`/inspections/${checklist.inspection_id}`)}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {t('common.back')}
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('analysis.title')}</h1>
          <p className="text-sm text-slate-500">
            {checklist.inspection?.name} — {checklist.machine?.tag} ({checklist.machine?.code})
          </p>
        </div>
      </div>

      {answers.length === 0 ? (
        <p className="text-slate-400">{t('analysis.empty')}</p>
      ) : (
        answers.map((ans) => {
          const s = edit[ans.id]
          if (!s) return null
          return (
            <NCCard
              key={ans.id}
              ans={ans}
              edit={s}
              onFieldChange={(field, value) => updateField(ans.id, field, value)}
              onSaveRating={() => handleSaveRating(ans.id)}
              onSavePlan={() => handleSavePlan(ans.id)}
              onSuggest={() => handleSuggest(ans.id)}
              isSuggesting={suggestingId === ans.id}
              ratingPending={ratingMut.isPending}
              planPending={planMut.isPending}
            />
          )
        })
      )}
    </div>
  )
}
