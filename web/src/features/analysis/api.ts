import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import type {
  AnalysisData,
  CommonPlansResult,
  Probability,
  RatingSuggestionResult,
  RiskLevel,
  Severity,
  SuggestResult,
} from './types'

// Metadados do checklist + lista de NCs (Supabase, RLS escopa).
export async function getAnalysis(checklistId: string): Promise<AnalysisData> {
  const [clRes, ansRes] = await Promise.all([
    supabase
      .from('checklists')
      .select('id,inspection_id,machine:machines(tag,code),inspection:inspections(name)')
      .eq('id', checklistId)
      .single(),
    supabase
      .from('answers')
      .select(`
        id,checklist_id,justification,probability,severity,risk_level,
        checklist_template_item:checklist_template_items(
          standard_item:standard_items(id,number,text)
        ),
        action_plans(id,answer_id,description,responsible_name,due_date,status),
        answer_photos(id,storage_path,position)
      `)
      .eq('checklist_id', checklistId)
      .eq('status', 'non_compliant'),
  ])

  if (clRes.error) throw clRes.error
  if (ansRes.error) throw ansRes.error

  const rawAnswers = (ansRes.data ?? []) as any[]

  // Batch-fetch signed URLs for all photos in a single Storage call.
  const allPaths: string[] = rawAnswers.flatMap(
    (a) => (a.answer_photos ?? []).map((p: any) => p.storage_path),
  )
  const signedMap: Record<string, string> = {}
  if (allPaths.length > 0) {
    try {
      const { data: signed } = await supabase.storage
        .from('evidencias')
        .createSignedUrls(allPaths, 3600)
      if (signed) {
        for (const item of signed) {
          if (item.signedUrl && item.path) signedMap[item.path] = item.signedUrl
        }
      }
    } catch {
      // bucket may not exist yet in local dev; photos simply won't render
    }
  }

  const answers = rawAnswers.map((a) => ({
    ...a,
    photos: (a.answer_photos ?? [])
      .sort((x: any, y: any) => x.position - y.position)
      .map((p: any) => ({ ...p, signed_url: signedMap[p.storage_path] })),
  }))

  return { checklist: clRes.data as any, answers }
}

// Grava probabilidade + gravidade + risco_calculado na resposta.
export async function updateRating(
  answerId: string,
  data: { probability: Probability; severity: Severity; risk_level: RiskLevel },
) {
  const { error } = await supabase.from('answers').update(data).eq('id', answerId)
  if (error) throw error
}

// Upsert (insert-or-update) do plano de ação vinculado à NC.
export async function upsertActionPlan(data: {
  answer_id: string
  description: string
  responsible_name: string | null
  due_date: string | null
}) {
  const { error } = await supabase
    .from('action_plans')
    .upsert(data, { onConflict: 'answer_id' })
  if (error) throw error
}

// Sugestão de plano de ação via RAG (FastAPI → Anthropic).
export const suggestPlan = (text: string, standard_item_number?: string) =>
  apiFetch<SuggestResult>('/knowledge/suggest', {
    method: 'POST',
    body: JSON.stringify({ text, standard_item_number: standard_item_number ?? null, limit: 3 }),
  })

// Planos de ação típicos já usados para este item da norma.
export const fetchCommonPlans = (standard_item_number: string) =>
  apiFetch<CommonPlansResult>('/knowledge/common-plans', {
    method: 'POST',
    body: JSON.stringify({ standard_item_number, limit: 10 }),
  })

// Distribuição histórica de probabilidade/gravidade para este item.
export const fetchRatingSuggestion = (standard_item_number: string) =>
  apiFetch<RatingSuggestionResult>('/knowledge/rating-suggestion', {
    method: 'POST',
    body: JSON.stringify({ standard_item_number }),
  })
