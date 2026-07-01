import { supabase } from '../../lib/supabase'
import type {
  ChecklistTemplate,
  SaveSelection,
  StandardItem,
  StandardSection,
  TemplateSectionSaved,
  TemplateInput,
} from './types'

// UUID fixo da versão NR-12 Portaria SEPRT 916/2019 (semeada em nr12.sql)
const STANDARD_VERSION_ID = '12000000-0000-0000-0000-000000000019'

async function currentAccountId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_account_id')
  if (error || !data) throw error ?? new Error('Conta não encontrada')
  return data as string
}

export async function listTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('id,account_id,standard_version_id,name,description,created_at')
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createTemplate(input: TemplateInput): Promise<ChecklistTemplate> {
  const account_id = await currentAccountId()
  const { data, error } = await supabase
    .from('checklist_templates')
    .insert({ ...input, account_id, standard_version_id: STANDARD_VERSION_ID })
    .select()
    .single()
  if (error) throw error
  return data as ChecklistTemplate
}

export async function listStandardSections(): Promise<StandardSection[]> {
  const { data, error } = await supabase
    .from('standard_sections')
    .select('id,section_type,code,title,position')
    .eq('standard_version_id', STANDARD_VERSION_ID)
    .order('position')
  if (error) throw error
  return (data ?? []) as StandardSection[]
}

export async function listStandardItems(sectionId: string): Promise<StandardItem[]> {
  const { data, error } = await supabase
    .from('standard_items')
    .select('id,standard_section_id,parent_item_id,number,text,position')
    .eq('standard_section_id', sectionId)
    .order('position')
  if (error) throw error
  return (data ?? []) as StandardItem[]
}

export async function getTemplateSections(templateId: string): Promise<TemplateSectionSaved[]> {
  const { data, error } = await supabase
    .from('checklist_template_sections')
    .select('id,standard_section_id,checklist_template_items(id,standard_item_id)')
    .eq('checklist_template_id', templateId)
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    standard_section_id: s.standard_section_id,
    standard_item_ids: (s.checklist_template_items as Array<{ id: string; standard_item_id: string }>).map(
      (i) => i.standard_item_id,
    ),
  }))
}

// Adiciona seções e itens ao template (nunca remove — protege checklists existentes).
export async function saveTemplateContent(
  templateId: string,
  selections: SaveSelection[],
): Promise<void> {
  const { data: existingSections } = await supabase
    .from('checklist_template_sections')
    .select('id,standard_section_id')
    .eq('checklist_template_id', templateId)

  const sectionMap = new Map<string, string>(
    (existingSections ?? []).map((s) => [s.standard_section_id, s.id]),
  )

  for (const { sectionId, itemIds } of selections) {
    if (itemIds.length === 0) continue

    let templateSectionId = sectionMap.get(sectionId)

    if (!templateSectionId) {
      const { data: newSec, error } = await supabase
        .from('checklist_template_sections')
        .insert({ checklist_template_id: templateId, standard_section_id: sectionId })
        .select('id')
        .single()
      if (error) throw error
      templateSectionId = newSec.id
      sectionMap.set(sectionId, templateSectionId!)
    }

    const { data: existingItems } = await supabase
      .from('checklist_template_items')
      .select('standard_item_id')
      .eq('checklist_template_section_id', templateSectionId)

    const existingSet = new Set((existingItems ?? []).map((i) => i.standard_item_id))
    const newItems = itemIds.filter((id) => !existingSet.has(id))

    if (newItems.length > 0) {
      const { error } = await supabase.from('checklist_template_items').insert(
        newItems.map((id) => ({
          checklist_template_section_id: templateSectionId,
          standard_item_id: id,
        })),
      )
      if (error) throw error
    }
  }
}
