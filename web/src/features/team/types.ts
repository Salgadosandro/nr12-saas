export type TeamMember = {
  id: string
  role: 'owner' | 'inspector'
  created_at: string
  profile: {
    full_name: string | null
    email: string | null
  } | null
}

export type PendingInvitation = {
  id: string
  email: string
  created_at: string
  expires_at: string
}

export type TeamData = {
  members: TeamMember[]
  pending_invitations: PendingInvitation[]
}
