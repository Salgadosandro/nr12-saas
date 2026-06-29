import { supabase } from '../../lib/supabase'
import type { Client, ClientInput } from './types'

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
