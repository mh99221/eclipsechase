import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || typeof body.email !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  const email = body.email.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email address',
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { error } = await supabase
    .from('email_signups')
    .upsert(
      { email, source: 'landing_page', locale: body.locale || 'en' },
      { onConflict: 'email' }
    )

  if (error) {
    console.error('[signup] Supabase error:', JSON.stringify(error, null, 2))
    throw createError({
      statusCode: 500,
      message: 'Failed to save signup. Please try again.',
    })
  }

  return { success: true }
})
