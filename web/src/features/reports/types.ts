// Espelha a resposta do FastAPI em GET /reports/{id} e os campos da tabela reports.
export type Report = {
  id: string
  inspection_id: string
  version: number
  status: 'draft' | 'in_review' | 'final'
  report_number: string | null
  final_text: string | null
  ai_generated_text: string | null
  created_at: string
}

export type Dashboard = {
  machines_total?: number
  machines_compliant?: number
  machines_not_applicable?: number
  nonconformities?: number
}

export type Machine = {
  tag?: string | null
  code?: string | null
  type?: string | null
  nr_applies?: boolean | null
}

export type Dossier = {
  company: { name?: string } | null
  engineer: { full_name?: string; crea?: string } | null
  anexo1_machines: Machine[]
  anexo2_dashboard: Dashboard
  anexo3_nonconformities: Array<{ norm_number?: string; norm_text?: string }>
}

export type ReportDetail = { report: Report; dossier: Dossier }
export type PdfResult = { pdf_path: string; signed_url: string; expires_in: number }
