import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemplate,
  getTemplateSections,
  listStandardItems,
  listStandardSections,
  listTemplates,
  saveTemplateContent,
} from './api'
import type { SaveSelection, TemplateInput } from './types'

export function useTemplates() {
  return useQuery({ queryKey: ['templates'], queryFn: listTemplates })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TemplateInput) => createTemplate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useStandardSections() {
  return useQuery({
    queryKey: ['standard-sections'],
    queryFn: listStandardSections,
    staleTime: Infinity,
  })
}

export function useStandardItems(sectionId: string | null) {
  return useQuery({
    queryKey: ['standard-items', sectionId],
    queryFn: () => listStandardItems(sectionId!),
    enabled: !!sectionId,
    staleTime: Infinity,
  })
}

export function useTemplateSections(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-sections', templateId],
    queryFn: () => getTemplateSections(templateId!),
    enabled: !!templateId,
  })
}

export function useSaveTemplateContent(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (selections: SaveSelection[]) => saveTemplateContent(templateId, selections),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-sections', templateId] }),
  })
}
