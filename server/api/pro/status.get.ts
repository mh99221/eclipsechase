import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.email) {
    return { isPro: false }
  }

  const supabase = await serverSupabaseServiceRole(event)
  const isPro = await isProUser(supabase, user)

  return { isPro }
})
