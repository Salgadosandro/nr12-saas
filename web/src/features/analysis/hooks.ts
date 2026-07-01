import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCommonPlans,
  fetchRatingSuggestion,
  getAnalysis,
  suggestPlan,
  updateRating,
  upsertActionPlan,
} from './api'
import type { Probability, RiskLevel, Severity } from './types'

export function useAnalysis(checklistId: string | undefined) {
  return useQuery({
    queryKey: ['analysis', checklistId],
    queryFn: () => getAnalysis(checklistId!),
    enabled: !!checklistId,
  })
}

export function useUpdateRating(checklistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { answerId: string; probability: Probability; severity: Severity; risk_level: RiskLevel }) =>
      updateRating(vars.answerId, {
        probability: vars.probability,
        severity: vars.severity,
        risk_level: vars.risk_level,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis', checklistId] }),
  })
}

export function useUpsertActionPlan(checklistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      answer_id: string
      description: string
      responsible_name: string | null
      due_date: string | null
    }) => upsertActionPlan(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analysis', checklistId] }),
  })
}

// Mutação pontual: sugere plano para UMA NC por vez; resultado vai para o estado local da página.
export function useSuggestPlan() {
  return useMutation({
    mutationFn: (vars: { text: string; standard_item_number?: string }) =>
      suggestPlan(vars.text, vars.standard_item_number),
  })
}

// Planos de ação típicos do item da norma — carregados automaticamente por card.
export function useCommonPlans(itemNumber: string | undefined) {
  return useQuery({
    queryKey: ['common-plans', itemNumber],
    queryFn: () => fetchCommonPlans(itemNumber!),
    enabled: !!itemNumber,
    staleTime: 5 * 60 * 1000,
  })
}

// Distribuição histórica de probabilidade/gravidade — carregada automaticamente por card.
export function useRatingSuggestion(itemNumber: string | undefined) {
  return useQuery({
    queryKey: ['rating-suggestion', itemNumber],
    queryFn: () => fetchRatingSuggestion(itemNumber!),
    enabled: !!itemNumber,
    staleTime: 5 * 60 * 1000,
  })
}
