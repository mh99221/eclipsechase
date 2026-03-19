import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Look up pro_users by email
  const { data: proUser } = await supabase
    .from('pro_users')
    .select('id, auth_user_id')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  // Backfill auth_user_id if not yet linked
  if (proUser && !proUser.auth_user_id) {
    await supabase
      .from('pro_users')
      .update({ auth_user_id: user.id })
      .eq('id', proUser.id)
  }

  return { isPro: !!proUser }
})
