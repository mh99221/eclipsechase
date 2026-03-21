import { Resend } from 'resend'

const FROM_EMAIL = 'EclipseChase.is <hello@eclipsechase.is>'

function getResend(): Resend | null {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) return null
  return new Resend(config.resendApiKey)
}

export async function sendWelcomeEmail(to: string) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping welcome email to', to)
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'You\'re on the list — EclipseChase.is',
      html: welcomeHtml(),
    })
    console.log('[email] Welcome email sent to', to)
  } catch (err: any) {
    // Don't throw — email failure shouldn't block signup
    console.error('[email] Failed to send welcome email:', err.message || err)
  }
}

export async function sendRestoreCode(to: string, code: string): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping restore code to', to)
    return
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Your EclipseChase.is restore code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; background: #050810; padding: 32px 24px;">
          <h2 style="color: #f59e0b; margin: 0 0 16px;">EclipseChase.is</h2>
          <p style="color: #94a3b8; font-size: 15px;">Your restore code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      background: #1a2232; color: #f59e0b; padding: 16px 24px;
                      border-radius: 8px; text-align: center; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">
            Enter this code in the app within 15 minutes.
            If you didn't request this, you can ignore this email.
          </p>
        </div>
      `,
    })
    console.log('[email] Restore code sent to', to)
  }
  catch (err: any) {
    console.error('[email] Failed to send restore code:', err.message || err)
  }
}

function welcomeHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:24px;font-weight:700;color:#f1f5f9;letter-spacing:0.02em;">
        EclipseChase<span style="color:#f59e0b;">.is</span>
      </div>
    </div>

    <!-- Body -->
    <div style="background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:32px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#f1f5f9;">
        You're on the list
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94a3b8;">
        Thanks for signing up for EclipseChase.is. We'll notify you when the live weather map
        and personalized viewing spot recommendations go live — just in time for the
        <strong style="color:#f59e0b;">August 12, 2026</strong> total solar eclipse in Iceland.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94a3b8;">
        In the meantime, check out our <a href="https://eclipsechase.is/guide" style="color:#f59e0b;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">complete guide</a>
        to planning your eclipse trip — best viewing spots, weather strategy, what to bring, and more.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="https://eclipsechase.is/guide"
           style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#050810;font-size:14px;font-weight:600;text-decoration:none;border-radius:3px;letter-spacing:0.03em;">
          READ THE GUIDE
        </a>
      </div>
    </div>

    <!-- Eclipse stats -->
    <div style="margin-top:24px;padding:16px;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;margin-bottom:8px;">
        TOTAL SOLAR ECLIPSE
      </div>
      <div style="font-size:13px;color:#94a3b8;">
        August 12, 2026 &middot; ~17:45 UTC &middot; Western Iceland
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1a2540;text-align:center;">
      <p style="margin:0;font-size:12px;color:#475569;">
        <a href="https://eclipsechase.is" style="color:#475569;text-decoration:none;">eclipsechase.is</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}
