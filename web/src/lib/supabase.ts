import { createClient } from '@supabase/supabase-js'

// Cliente único da app. Usa a anon key (pública); o RLS no banco é quem decide
// o que cada usuário enxerga. A sessão (JWT) é guardada/renovada automaticamente.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
