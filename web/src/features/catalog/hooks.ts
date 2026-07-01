import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMachineModel,
  createMachineType,
  listMachineModels,
  listMachineTypes,
} from './api'
import type { MachineModelInput, MachineTypeInput } from './types'

export function useMachineTypes() {
  return useQuery({ queryKey: ['machine-types'], queryFn: listMachineTypes })
}

export function useCreateMachineType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MachineTypeInput) => createMachineType(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machine-types'] }),
  })
}

export function useMachineModels(typeId?: string) {
  return useQuery({
    queryKey: ['machine-models', typeId ?? 'all'],
    queryFn: () => listMachineModels(typeId),
  })
}

export function useCreateMachineModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MachineModelInput) => createMachineModel(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machine-models'] }),
  })
}
