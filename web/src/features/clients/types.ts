export type Client = {
  id: string
  name: string
  cnpj: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export type ClientInput = {
  name: string
  cnpj: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
}

export type Location = {
  id: string
  client_id: string
  name: string
  code: string
  address: string | null
  created_at: string
}

export type LocationInput = {
  name: string
  code: string
  address: string | null
}

export type Machine = {
  id: string
  machine_model_id: string
  location_id: string
  tag: string
  code: string
  serial_number: string | null
  manufacture_year: number | null
  created_at: string
  machine_model?: {
    id: string
    manufacturer: string
    model_code: string
    machine_type?: { id: string; name: string }
  }
  location?: Pick<Location, 'id' | 'name' | 'code'>
}

export type MachineInput = {
  machine_model_id: string
  location_id: string
  tag: string
  code: string
  serial_number: string | null
  manufacture_year: number | null
}
