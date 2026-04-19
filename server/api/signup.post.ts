import { serverSupabaseServiceRole } from '#supabase/server'
import { sendWelcomeEmail } from '../utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email || typeof body.email !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required',
    })
  }

  const email = body.email.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email address',
    })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Check if already signed up (don't re-send welcome email)
  const { data: existing } = await supabase
    .from('email_signups')
    .select('email')
    .eq('email', email)
    .maybeSingle()

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
      statusMessage: 'Failed to save signup. Please try again.',
    })
  }

  // Send welcome email only for new signups (not re-submissions)
  if (!existing) {
    sendWelcomeEmail(email)
  }

  return { success: true }
})
