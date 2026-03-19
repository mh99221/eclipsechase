import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Check if a Supabase Auth user has an active Pro subscription.
 * Uses two separate queries to avoid PostgREST filter injection via email.
 */
export async function isProUser(supabase: SupabaseClient, user: User): Promise<boolean> {
  // Check by auth_user_id first (most reliable)
  if (user.id) {
    const { data } = await supabase
      .from('pro_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (data) return true
  }

  // Fall back to email lookup (for users who haven't linked auth_user_id yet)
  if (user.email) {
    const { data } = await supabase
      .from('pro_users')
      .select('id')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle()

    if (data) return true
  }

  return false
}
