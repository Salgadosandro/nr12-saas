import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateDraft, generatePdf, getReport, listReports } from './api'

export function useReports() {
  return useQuery({ queryKey: ['reports'], queryFn: listReports })
}

// Busca detalhe+dossier pelo FastAPI. Só roda quando id é truthy.
export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => getReport(id!),
    enabled: !!id,
  })
}

// Gera parecer (IA) e invalida o detalhe para refletir ai_generated_text novo.
export function useGenerateDraft(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => generateDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', id] }),
  })
}

// Gera PDF; retorna { signed_url } — não precisa invalidar, é um artefato externo.
export function useGeneratePdf(id: string) {
  return useMutation({ mutationFn: () => generatePdf(id) })
}
