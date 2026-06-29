import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

// O "estado de autenticação" que qualquer tela pode ler via useAuth().
export type AuthState = { session: Session | null; loading: boolean }

export const AuthContext = createContext<AuthState>({ session: null, loading: true })

// Hook de conveniência: useAuth() devolve { session, loading }.
export function useAuth() {
  return useContext(AuthContext)
}
