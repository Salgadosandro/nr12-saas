export type Inspection = {
  id: string
  account_id: string
  client_id: string
  name: string
  sequence_number: number
  status: 'in_field' | 'completed'
  performed_on: string | null
  notes: string | null
  created_at: string
  client?: { name: string } | null
}

export type InspectionInput = {
  client_id: string
  name: string
  performed_on: string | null
  notes: string | null
}

export type ChecklistSummary = {
  id: string
  machine_id: string
  status: 'in_progress' | 'completed' | null
  machine: { tag: string; code: string } | null
}

export type InspectionDetail = Inspection & {
  checklists: ChecklistSummary[]
}
