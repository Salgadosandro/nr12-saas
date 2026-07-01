import { supabase } from '../../lib/supabase'
import type { Client, ClientInput, Location, LocationInput, Machine, MachineInput } from './types'

// CAMADA DE DADOS — fala direto com o Supabase (PostgREST). O RLS garante que só
// vêm/vão os clientes da conta do usuário logado. Nada de FastAPI aqui (é CRUD).

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,cnpj,contact_name,contact_email,contact_phone,created_at')
    .order('name')
  if (error) throw error
  return data ?? []
}

// clients é tabela-raiz: account_id é NOT NULL sem default, então informamos o
// da conta logada (via helper SQL). O RLS ainda confere que é mesmo a sua conta.
async function currentAccountId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_account_id')
  if (error || !data) throw error ?? new Error('Conta não encontrada')
  return data as string
}

export async function createClient(input: ClientInput): Promise<Client> {
  const account_id = await currentAccountId()
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, account_id })
    .select()
    .single()
  if (error) throw error
  return data as Client
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Client
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,cnpj,contact_name,contact_email,contact_phone,created_at')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Client
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function listLocations(clientId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id,client_id,name,code,address,created_at')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createLocation(clientId: string, input: LocationInput): Promise<Location> {
  const { data, error } = await supabase
    .from('locations')
    .insert({ ...input, client_id: clientId })
    .select('id,client_id,name,code,address,created_at')
    .single()
  if (error) throw error
  return data as Location
}

// ── Machines ──────────────────────────────────────────────────────────────────

const MACHINE_SELECT = `
  id, machine_model_id, location_id, tag, code, serial_number, manufacture_year, created_at,
  machine_model:machine_models(id, manufacturer, model_code, machine_type:machine_types(id, name)),
  location:locations(id, name, code)
`

export async function listMachinesByClient(clientId: string): Promise<Machine[]> {
  const { data: locs, error: locErr } = await supabase
    .from('locations')
    .select('id')
    .eq('client_id', clientId)
  if (locErr) throw locErr
  if (!locs?.length) return []

  const locationIds = locs.map((l) => l.id)
  const { data, error } = await supabase
    .from('machines')
    .select(MACHINE_SELECT)
    .in('location_id', locationIds)
    .order('tag')
  if (error) throw error
  return (data ?? []) as unknown as Machine[]
}

export async function createMachine(input: MachineInput): Promise<Machine> {
  const { data, error } = await supabase
    .from('machines')
    .insert(input)
    .select(MACHINE_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Machine
}

export async function bulkCreateMachines(
  inputs: MachineInput[],
): Promise<{ ok: number; failed: number }> {
  const { data, error } = await supabase
    .from('machines')
    .insert(inputs)
    .select('id')
  if (error) throw error
  return { ok: data?.length ?? 0, failed: 0 }
}
