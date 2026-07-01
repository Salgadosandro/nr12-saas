import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProfessional, listProfessionals, updateProfessional } from './api'
import type { ProfessionalInput } from './types'

export function useProfessionals() {
  return useQuery({ queryKey: ['professionals'], queryFn: listProfessionals })
}

export function useCreateProfessional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfessionalInput) => createProfessional(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  })
}

export function useUpdateProfessional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProfessionalInput }) =>
      updateProfessional(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  })
}
