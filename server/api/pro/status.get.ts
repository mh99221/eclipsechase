import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const email = query.email as string

  if (!email) {
    return { isPro: false }
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('pro_users')
    .select('id')
    .eq('email', email)
    .eq('is_active', true)
    .limit(1)
    .single()

  return { isPro: !!data }
})
