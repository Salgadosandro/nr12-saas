export type Professional = {
  id: string
  account_id: string
  member_id: string | null
  full_name: string
  crea: string | null
  title: string | null
  cpf: string | null
  created_at: string
}

export type ProfessionalInput = {
  full_name: string
  crea: string | null
  title: string | null
  cpf: string | null
}
