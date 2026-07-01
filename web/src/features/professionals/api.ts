import { supabase } from '../../lib/supabase'
import type { Professional, ProfessionalInput } from './types'

async function currentAccountId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_account_id')
  if (error || !data) throw error ?? new Error('Conta não encontrada')
  return data as string
}

export async function listProfessionals(): Promise<Professional[]> {
  const { data, error } = await supabase
    .from('professionals')
    .select('id,account_id,member_id,full_name,crea,title,cpf,created_at')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function createProfessional(input: ProfessionalInput): Promise<Professional> {
  const account_id = await currentAccountId()
  const { data, error } = await supabase
    .from('professionals')
    .insert({ ...input, account_id })
    .select()
    .single()
  if (error) throw error
  return data as Professional
}

export async function updateProfessional(id: string, input: ProfessionalInput): Promise<Professional> {
  const { data, error } = await supabase
    .from('professionals')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Professional
}
