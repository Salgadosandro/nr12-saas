import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL

// Chama o FastAPI anexando o JWT do usuário logado. É a "ponte" para o backend
// (laudo / IA / billing). O CRUD simples NÃO passa por aqui — vai direto no
// Supabase. O backend valida o token e o RLS aplica como esse usuário.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || res.statusText)
  }
  return res.json() as Promise<T>
}
