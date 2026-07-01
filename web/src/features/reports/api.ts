import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import type { PdfResult, Report, ReportDetail } from './types'

// A LISTA é dado simples → Supabase direto (RLS).
export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id,inspection_id,version,status,report_number,final_text,ai_generated_text,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Report[]
}

// O DETALHE e as AÇÕES (IA, PDF) são FLUXO → FastAPI (via lib/api.ts, com JWT).
export const getReport = (id: string) => apiFetch<ReportDetail>(`/reports/${id}`)
export const generateDraft = (id: string) => apiFetch<unknown>(`/reports/${id}/draft`, { method: 'POST' })
export const generatePdf = (id: string) => apiFetch<PdfResult>(`/reports/${id}/pdf`, { method: 'POST' })
