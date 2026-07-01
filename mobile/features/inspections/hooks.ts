import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getInspection, listInspections, updateInspectionStatus } from './api'
import type { InspectionStatus } from './types'

export function useInspections() {
  return useQuery({ queryKey: ['inspections'], queryFn: listInspections })
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: ['inspections', id],
    queryFn: () => getInspection(id),
    enabled: !!id,
  })
}

export function useUpdateInspectionStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: InspectionStatus) => updateInspectionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', id] })
      qc.invalidateQueries({ queryKey: ['inspections'] })
    },
  })
}
