import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from './api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 60 * 1000, // 1 min — dados de painel não precisam ser tempo real
  })
}
