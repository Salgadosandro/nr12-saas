import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import type { Inspection, InspectionDetail, InspectionInput } from './types'

// LISTA e DETALHE → Supabase direto (RLS garante o escopo).
// GERAR LAUDO → FastAPI (lógica de versionamento no servidor).

export async function listInspections(): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('id,name,sequence_number,status,performed_on,client_id,created_at,client:clients(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Inspection[]
}

export async function getInspection(id: string): Promise<InspectionDetail> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*,client:clients(name),checklists(id,machine_id,status,machine:machines(tag,code))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as InspectionDetail
}

export async function createInspection(input: InspectionInput): Promise<Inspection> {
  // sequence_number auto-calculado: conta inspeções com mesmo client+name e soma 1.
  const { count } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', input.client_id)
    .eq('name', input.name)
    .is('deleted_at', null)

  const { data, error } = await supabase
    .from('inspections')
    .insert({ ...input, sequence_number: (count ?? 0) + 1 })
    .select()
    .single()
  if (error) throw error
  return data as Inspection
}

export async function updateInspectionStatus(
  id: string,
  status: 'in_field' | 'completed',
): Promise<void> {
  const { error } = await supabase.from('inspections').update({ status }).eq('id', id)
  if (error) throw error
}

export async function createChecklist(
  inspectionId: string,
  machineId: string,
  templateId: string,
  nrApplies = true,
  exclusionCode: string | null = null,
  exclusionNotes: string | null = null,
): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    inspection_id: inspectionId,
    machine_id: machineId,
    checklist_template_id: templateId,
    status: 'in_progress',
    nr_applies: nrApplies,
  }
  if (!nrApplies) {
    payload.exclusion_code = exclusionCode
    payload.exclusion_notes = exclusionNotes || null
  }

  const { data: cl, error } = await supabase
    .from('checklists')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error

  // Pré-cria respostas apenas quando NR se aplica
  if (nrApplies) {
    const { data: sections } = await supabase
      .from('checklist_template_sections')
      .select('checklist_template_items(id)')
      .eq('checklist_template_id', templateId)

    const templateItemIds = (sections ?? []).flatMap((s) =>
      (s.checklist_template_items as Array<{ id: string }>).map((i) => i.id),
    )

    if (templateItemIds.length > 0) {
      await supabase.from('answers').insert(
        templateItemIds.map((tiid) => ({
          checklist_id: cl.id,
          checklist_template_item_id: tiid,
          status: 'compliant',
        })),
      )
    }
  }

  return cl
}

// Cria laudo via FastAPI (versionamento automático).
export const createReport = (inspectionId: string) =>
  apiFetch<{ id: string }>(`/inspections/${inspectionId}/reports`, {
    method: 'POST',
    body: JSON.stringify({ revision_reason: null }),
  })
