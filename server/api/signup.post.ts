import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL
  const supabaseKey = config.public.supabaseKey || process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) return null

  _supabase = createClient(supabaseUrl, supabaseKey)
  return _supabase
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || typeof body.email !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  const email = body.email.trim().toLowerCase()

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email address',
    })
  }

  const supabase = getSupabase()

  if (!supabase) {
    console.log(`[signup] Email signup (no Supabase configured): ${email}`)
    return { success: true }
  }

  const { error } = await supabase
    .from('email_signups')
    .upsert(
      { email, source: 'landing_page', locale: body.locale || 'en' },
      { onConflict: 'email' }
    )

  if (error) {
    console.error('[signup] Supabase error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to save signup. Please try again.',
    })
  }

  return { success: true }
})
