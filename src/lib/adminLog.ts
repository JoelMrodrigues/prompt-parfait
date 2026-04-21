import { supabase } from './supabase'

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  supabase.from('admin_logs').insert({
    admin_id: session?.user?.id || null,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: details || null,
  }).then(() => {})
}
