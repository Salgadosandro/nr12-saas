import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  completeChecklist,
  deleteAnswerPhoto,
  getChecklist,
  getChecklistAnswers,
  getPhotoSignedUrl,
  updateAnswer,
  uploadAnswerPhoto,
} from './api'
import type { AnswerStatus, SectionGroup } from './types'

export function useChecklist(id: string) {
  return useQuery({
    queryKey: ['checklists', id],
    queryFn: () => getChecklist(id),
    enabled: !!id,
  })
}

export function useChecklistAnswers(checklistId: string) {
  return useQuery({
    queryKey: ['answers', checklistId],
    queryFn: () => getChecklistAnswers(checklistId),
    enabled: !!checklistId,
    select(data) {
      const sectionMap = new Map<string, SectionGroup>()
      for (const answer of data) {
        const sec = answer.template_item.checklist_template_section.standard_section
        if (!sectionMap.has(sec.id)) {
          sectionMap.set(sec.id, {
            sectionId: sec.id,
            code: sec.code,
            title: sec.title,
            position: sec.position,
            answers: [],
          })
        }
        sectionMap.get(sec.id)!.answers.push(answer)
      }
      return Array.from(sectionMap.values())
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          ...s,
          answers: s.answers.sort(
            (a, b) =>
              a.template_item.standard_item.position -
              b.template_item.standard_item.position,
          ),
        }))
    },
  })
}

export function useUpdateAnswer(checklistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ answerId, status, notes }: { answerId: string; status?: AnswerStatus; notes?: string | null }) =>
      updateAnswer(answerId, { status, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['answers', checklistId] }),
  })
}

export function useCompleteChecklist(checklistId: string, inspectionId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => completeChecklist(checklistId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklists', checklistId] })
      if (inspectionId) qc.invalidateQueries({ queryKey: ['inspections', inspectionId] })
    },
  })
}

export function useUploadAnswerPhoto(checklistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      answerId,
      position,
      source,
    }: {
      answerId: string
      position: number
      source: 'camera' | 'library'
    }) => uploadAnswerPhoto(answerId, position, source),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['answers', checklistId] }),
  })
}

export function useDeleteAnswerPhoto(checklistId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ photoId, storagePath }: { photoId: string; storagePath: string }) =>
      deleteAnswerPhoto(photoId, storagePath),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['answers', checklistId] }),
  })
}

export function usePhotoSignedUrl(storagePath: string | null) {
  return useQuery({
    queryKey: ['photo-url', storagePath],
    queryFn: () => getPhotoSignedUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 50 * 60 * 1000, // 50min (URLs expire in 1h)
  })
}
