import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createChecklist,
  createInspection,
  createReport,
  getInspection,
  listInspections,
  updateInspectionStatus,
} from './api'
import type { InspectionInput } from './types'


export function useInspections() {
  return useQuery({ queryKey: ['inspections'], queryFn: listInspections })
}

export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: ['inspections', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  })
}

export function useCreateInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InspectionInput) => createInspection(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  })
}

// Cria laudo e invalida a lista de laudos para refletir o novo.
export function useCreateReport(inspectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createReport(inspectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}

export function useUpdateInspectionStatus(inspectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: 'in_field' | 'completed') => updateInspectionStatus(inspectionId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections', inspectionId] })
      qc.invalidateQueries({ queryKey: ['inspections'] })
    },
  })
}

export function useCreateChecklist(inspectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      machineId,
      templateId,
      nrApplies,
      exclusionCode,
      exclusionNotes,
    }: {
      machineId: string
      templateId: string
      nrApplies: boolean
      exclusionCode: string | null
      exclusionNotes: string | null
    }) => createChecklist(inspectionId, machineId, templateId, nrApplies, exclusionCode, exclusionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections', inspectionId] }),
  })
}
