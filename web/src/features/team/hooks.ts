import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelInvite, getTeam, inviteMember } from './api'

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: getTeam,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteMember(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useCancelInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}
