import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClient,
  createLocation,
  createMachine,
  getClient,
  listClients,
  listLocations,
  listMachinesByClient,
  updateClient,
} from './api'
import type { ClientInput, LocationInput, MachineInput } from './types'

// CAMADA DE ESTADO — React Query embrulha a busca com cache/loading/erro e,
// nas mutações, INVALIDA a lista: ao criar/editar, o ['clients'] é refeito
// automaticamente. A tela nunca mexe em cache na mão.

export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: listClients })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientInput) => createClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) => updateClient(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
    enabled: !!id,
  })
}

export function useLocations(clientId: string) {
  return useQuery({
    queryKey: ['locations', clientId],
    queryFn: () => listLocations(clientId),
    enabled: !!clientId,
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, input }: { clientId: string; input: LocationInput }) =>
      createLocation(clientId, input),
    onSuccess: (_, { clientId }) =>
      qc.invalidateQueries({ queryKey: ['locations', clientId] }),
  })
}

export function useMachinesByClient(clientId: string) {
  return useQuery({
    queryKey: ['machines', clientId],
    queryFn: () => listMachinesByClient(clientId),
    enabled: !!clientId,
  })
}

export function useCreateMachine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MachineInput) => createMachine(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['machines'] }),
  })
}
