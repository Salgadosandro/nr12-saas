import { supabase } from '../../lib/supabase'
import type { MachineType, MachineTypeInput, MachineModel, MachineModelInput } from './types'

export async function listMachineTypes(): Promise<MachineType[]> {
  const { data, error } = await supabase
    .from('machine_types')
    .select('id,name,created_at')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createMachineType(input: MachineTypeInput): Promise<MachineType> {
  const { data, error } = await supabase
    .from('machine_types')
    .insert(input)
    .select('id,name,created_at')
    .single()
  if (error) throw error
  return data as MachineType
}

export async function listMachineModels(typeId?: string): Promise<MachineModel[]> {
  let q = supabase
    .from('machine_models')
    .select('id,machine_type_id,manufacturer,model_code,created_at,machine_type:machine_types(id,name)')
    .order('manufacturer')
  if (typeId) q = q.eq('machine_type_id', typeId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as MachineModel[]
}

export async function createMachineModel(input: MachineModelInput): Promise<MachineModel> {
  const { data, error } = await supabase
    .from('machine_models')
    .insert(input)
    .select('id,machine_type_id,manufacturer,model_code,created_at')
    .single()
  if (error) throw error
  return data as MachineModel
}
