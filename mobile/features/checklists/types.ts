export type AnswerStatus = 'compliant' | 'non_compliant' | 'na'

export type AnswerPhoto = {
  id: string
  storage_path: string
  position: number
}

export type Answer = {
  id: string
  status: AnswerStatus
  notes: string | null
  checklist_template_item_id: string
  answer_photos: AnswerPhoto[]
  template_item: {
    id: string
    standard_item: {
      id: string
      number: string
      text: string
      position: number
      standard_section_id: string
    }
    checklist_template_section: {
      id: string
      standard_section: {
        id: string
        code: string
        title: string
        position: number
      }
    }
  }
}

export type ChecklistDetail = {
  id: string
  status: 'in_progress' | 'completed'
  nr_applies: boolean
  exclusion_code: string | null
  exclusion_notes: string | null
  machine: { tag: string; code: string } | null
  inspection: { id: string; name: string } | null
}

export type SectionGroup = {
  sectionId: string
  code: string
  title: string
  position: number
  answers: Answer[]
}
