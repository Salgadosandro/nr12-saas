// A forma de um cliente (empresa inspecionada) como vem/vai ao banco.
export type Client = {
  id: string
  name: string
  cnpj: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

// O que o formulário envia (sem id/created_at, que o banco gera).
export type ClientInput = {
  name: string
  cnpj: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
}
