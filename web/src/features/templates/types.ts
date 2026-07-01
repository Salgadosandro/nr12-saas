export type ChecklistTemplate = {
  id: string
  account_id: string
  standard_version_id: string
  name: string
  description: string | null
  created_at: string
}

export type TemplateInput = {
  name: string
  description: string | null
}

export type StandardSection = {
  id: string
  section_type: 'module' | 'annex'
  code: string
  title: string
  position: number
}

export type StandardItem = {
  id: string
  standard_section_id: string
  parent_item_id: string | null
  number: string
  text: string
  position: number
}

export type TemplateSectionSaved = {
  id: string
  standard_section_id: string
  standard_item_ids: string[]
}

export type SaveSelection = {
  sectionId: string
  itemIds: string[]
}
