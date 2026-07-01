export type MachineType = {
  id: string
  name: string
  created_at: string
}

export type MachineTypeInput = {
  name: string
}

export type MachineModel = {
  id: string
  machine_type_id: string
  manufacturer: string
  model_code: string
  created_at: string
  machine_type?: Pick<MachineType, 'id' | 'name'>
}

export type MachineModelInput = {
  machine_type_id: string
  manufacturer: string
  model_code: string
}
