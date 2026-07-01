import { apiFetch } from '../../lib/api'
import type { TeamData } from './types'

export async function getTeam(): Promise<TeamData> {
  return apiFetch<TeamData>('/team/members')
}

export async function inviteMember(email: string): Promise<void> {
  await apiFetch('/team/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function cancelInvite(invitationId: string): Promise<void> {
  await apiFetch(`/team/invite/${invitationId}`, { method: 'DELETE' })
}
