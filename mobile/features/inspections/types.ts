export type InspectionStatus = 'in_field' | 'completed'

export type Inspection = {
  id: string
  name: string
  sequence_number: number
  status: InspectionStatus
  performed_on: string | null
  client: { name: string } | null
  checklists: { id: string; status: string }[]
}

export type ChecklistSummary = {
  id: string
  status: 'in_progress' | 'completed'
  nr_applies: boolean
  machine: { tag: string; code: string } | null
}

export type InspectionDetail = {
  id: string
  name: string
  status: InspectionStatus
  performed_on: string | null
  client: { name: string } | null
  checklists: ChecklistSummary[]
}
