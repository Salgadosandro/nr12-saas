import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useCancelInvite, useInviteMember, useTeam } from './hooks'
import type { TeamMember, PendingInvitation } from './types'

const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietário',
  inspector: 'Inspetor',
}

const ROLE_CLASSES: Record<string, string> = {
  owner: 'bg-slate-900 text-white',
  inspector: 'bg-teal-100 text-teal-700',
}

function MemberRow({ member }: { member: TeamMember }) {
  const name = member.profile?.full_name ?? '—'
  const email = member.profile?.email ?? '—'
  const joined = new Date(member.created_at).toLocaleDateString('pt-BR')

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{name}</p>
        <p className="text-xs text-slate-400">{email}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_CLASSES[member.role] ?? ''}`}>
          {ROLE_LABEL[member.role] ?? member.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">{joined}</td>
      <td className="px-4 py-3" />
    </tr>
  )
}

function PendingRow({ invite, onCancel }: { invite: PendingInvitation; onCancel: () => void }) {
  const expires = new Date(invite.expires_at).toLocaleDateString('pt-BR')
  return (
    <tr className="border-t border-slate-100 bg-amber-50/40">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-700">{invite.email}</p>
        <p className="text-xs text-amber-600">Convite pendente · expira em {expires}</p>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          Aguardando
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-400">
        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onCancel}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Cancelar
        </button>
      </td>
    </tr>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inviteMut = useInviteMember()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    inviteMut.mutate(email.trim(), {
      onSuccess: () => setSuccess(true),
      onError: (err) => setError(err.message),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        {success ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h2 className="font-bold text-slate-900">{t('team.inviteSent')}</h2>
                <p className="text-sm text-slate-500">{email}</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-500">{t('team.inviteSentHint')}</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white"
            >
              {t('common.back')}
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-bold text-slate-900">{t('team.inviteTitle')}</h2>
            <p className="mb-4 text-sm text-slate-500">{t('team.inviteHint')}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-600">{t('auth.email')}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inspector@empresa.com"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={inviteMut.isPending || !email}
                  className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {inviteMut.isPending ? t('common.saving') : t('team.sendInvite')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useTeam()
  const cancelMut = useCancelInvite()
  const [showInvite, setShowInvite] = useState(false)

  const totalSlots = 5
  const usedSlots = (data?.members.length ?? 0) + (data?.pending_invitations.length ?? 0)
  const canInvite = usedSlots < totalSlots

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('team.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {usedSlots}/{totalSlots} {t('team.slots')}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          disabled={!canInvite}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          title={!canInvite ? t('team.limitReached') : undefined}
        >
          + {t('team.invite')}
        </button>
      </div>

      {isLoading && <p className="text-slate-400">{t('common.loading')}</p>}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t('team.apiError')}
        </div>
      )}

      {data && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-500">{t('team.member')}</th>
                <th className="px-4 py-3 font-medium text-slate-500">{t('team.role')}</th>
                <th className="px-4 py-3 font-medium text-slate-500">{t('team.joined')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
              {data.pending_invitations.map((inv) => (
                <PendingRow
                  key={inv.id}
                  invite={inv}
                  onCancel={() => cancelMut.mutate(inv.id)}
                />
              ))}
              {data.members.length === 0 && data.pending_invitations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    {t('team.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
