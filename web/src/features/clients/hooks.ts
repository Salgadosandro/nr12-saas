import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient, listClients, updateClient } from './api'
import type { ClientInput } from './types'

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
