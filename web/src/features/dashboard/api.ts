import { supabase } from '../../lib/supabase'

export type RiskBreakdown = {
  critical: number
  high: number
  medium: number
  low: number
}

export type RecentInspection = {
  id: string
  name: string
  status: 'in_field' | 'completed'
  performed_on: string | null
  created_at: string
  client: { name: string } | null
}

export type DashboardStats = {
  totalInspections: number
  totalNCs: number
  criticalNCs: number
  complianceRate: number
  ncByRisk: RiskBreakdown
  recentInspections: RecentInspection[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    inspRes,
    ncRes,
    critRes,
    highRes,
    medRes,
    lowRes,
    complRes,
    totalAnswRes,
    recentRes,
  ] = await Promise.all([
    supabase.from('inspections').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'non_compliant'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'non_compliant').eq('risk_level', 'critical'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'non_compliant').eq('risk_level', 'high'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'non_compliant').eq('risk_level', 'medium'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'non_compliant').eq('risk_level', 'low'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).eq('status', 'compliant'),
    supabase.from('answers').select('id', { count: 'exact', head: true }).neq('status', 'not_applicable'),
    supabase
      .from('inspections')
      .select('id,name,status,performed_on,created_at,client:clients(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalAnswered = totalAnswRes.count ?? 0
  const compliant = complRes.count ?? 0
  const complianceRate = totalAnswered > 0 ? Math.round((compliant / totalAnswered) * 100) : 0

  return {
    totalInspections: inspRes.count ?? 0,
    totalNCs: ncRes.count ?? 0,
    criticalNCs: critRes.count ?? 0,
    complianceRate,
    ncByRisk: {
      critical: critRes.count ?? 0,
      high: highRes.count ?? 0,
      medium: medRes.count ?? 0,
      low: lowRes.count ?? 0,
    },
    recentInspections: (recentRes.data ?? []) as unknown as RecentInspection[],
  }
}
