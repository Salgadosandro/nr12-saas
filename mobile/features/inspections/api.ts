import { supabase } from '../../lib/supabase'
import type { Inspection, InspectionDetail, InspectionStatus } from './types'

export async function listInspections(): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('id,name,sequence_number,status,performed_on,client:clients(name),checklists(id,status)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Inspection[]
}

export async function updateInspectionStatus(
  id: string,
  status: InspectionStatus,
): Promise<void> {
  const { error } = await supabase.from('inspections').update({ status }).eq('id', id)
  if (error) throw error
}

export async function getInspection(id: string): Promise<InspectionDetail> {
  const { data, error } = await supabase
    .from('inspections')
    .select('id,name,status,performed_on,client:clients(name),checklists(id,status,nr_applies,machine:machines(tag,code))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as InspectionDetail
}
