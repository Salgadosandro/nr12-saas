export type Probability = 'low' | 'medium' | 'high'
export type Severity = 'minor' | 'moderate' | 'major'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// Matriz de risco espelhada do banco (risk_matrix_rules).
// Usada client-side para pré-visualizar o risco sem round-trip.
export const RISK_MATRIX: Record<Probability, Record<Severity, RiskLevel>> = {
  low:    { minor: 'low',    moderate: 'low',    major: 'medium'   },
  medium: { minor: 'low',    moderate: 'medium', major: 'high'     },
  high:   { minor: 'medium', moderate: 'high',   major: 'critical' },
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-amber-100 text-amber-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export type ActionPlan = {
  id: string
  answer_id: string
  description: string
  responsible_name: string | null
  due_date: string | null
  status: 'pendente' | 'verificado'
}

export type AnswerPhoto = {
  id: string
  storage_path: string
  position: 1 | 2 | 3
  signed_url?: string
}

export type Answer = {
  id: string
  checklist_id: string
  justification: string | null
  probability: Probability | null
  severity: Severity | null
  risk_level: RiskLevel | null
  checklist_template_item?: {
    standard_item?: { id: string; number: string; text: string } | null
  } | null
  action_plans?: ActionPlan[]
  photos?: AnswerPhoto[]
}

export type ChecklistMeta = {
  id: string
  inspection_id: string
  machine?: { tag: string; code: string } | null
  inspection?: { name: string } | null
}

export type AnalysisData = {
  checklist: ChecklistMeta
  answers: Answer[]
}

export type SuggestResult = {
  suggested_plan: string | null
  message?: string
}

export type CommonPlan = {
  plan_text: string
  vezes: number
}

export type CommonPlansResult = {
  standard_item_number: string
  plans: CommonPlan[]
}

export type RatingEntry = {
  value: string
  n: number
  pct: number
}

export type RatingSuggestionResult =
  | {
      standard_item_number: string
      sample_size: number
      sufficient: true
      frequencia: RatingEntry[]
      gravidade: RatingEntry[]
    }
  | {
      standard_item_number: string
      sample_size: number
      sufficient: false
      message: string
    }
