import { createHash } from 'crypto'
import { Resend } from 'resend'

const FROM_EMAIL = 'EclipseChase.is <hello@eclipsechase.is>'

export type EmailLocale = 'en' | 'is'

/** Coerce whatever the caller hands us into a supported locale. */
function resolveLocale(input: string | null | undefined): EmailLocale {
  return input === 'is' ? 'is' : 'en'
}

export function normalizeEmail(s: string): string {
  return s.toLowerCase().trim()
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  return local.length > 1
    ? local[0] + '***' + local[local.length - 1] + '@' + domain
    : local + '***@' + domain
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex')
}

function getResend(): Resend | null {
  const config = useRuntimeConfig()
  if (!config.resendApiKey) return null
  return new Resend(config.resendApiKey)
}

/* ────────────────────────────────────────────────────────────────
   Locale-keyed strings — separated from layout so the same HTML
   shell renders for both languages. Keep the EN and IS arms in sync
   when adding new copy.
   ──────────────────────────────────────────────────────────────── */

const WELCOME_STRINGS: Record<EmailLocale, {
  subject: string
  heading: string
  body1: string
  body2: string
  cta: string
  eclipseLabel: string
  eclipseStats: string
}> = {
  en: {
    subject: 'You\'re on the list — EclipseChase.is',
    heading: 'You\'re on the list',
    body1:
      'Thanks for signing up. You\'ll get two more emails from us — one when the August 12 forecasts firm up (around mid-July 2026), and one on eclipse-day morning with current conditions. Nothing in between.',
    body2:
      'EclipseChase is already up: 28 curated viewing spots across Western Iceland, terrain-based horizon checks at 30 m resolution, and 10 years of August 12 cloud history for each spot. Start with the <a href="https://eclipsechase.is/guide" style="color:#f59e0b;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">complete guide</a> to plan your trip.',
    cta: 'READ THE GUIDE',
    eclipseLabel: 'TOTAL SOLAR ECLIPSE',
    eclipseStats: 'August 12, 2026 &middot; ~17:45 UTC &middot; Western Iceland',
  },
  is: {
    subject: 'Þú ert á listanum — EclipseChase.is',
    heading: 'Þú ert á listanum',
    body1:
      'Takk fyrir að skrá þig. Þú færð tvo tölvupósta í viðbót frá okkur — einn þegar spár fyrir 12. ágúst skerpast (í kringum miðjan júlí 2026), og einn að morgni sólmyrkvadagsins með núverandi skilyrðum. Ekkert á milli.',
    body2:
      'EclipseChase er þegar virkt: 28 valdir áhorfsstaðir um vesturhluta Íslands, sjónlínuathuganir byggðar á landslagi í 30 m upplausn, og 10 ára skýjasaga fyrir 12. ágúst á hverjum stað. Byrjaðu á <a href="https://eclipsechase.is/is/guide" style="color:#f59e0b;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">leiðsögunni</a> til að skipuleggja ferðina.',
    cta: 'LESA LEIÐSÖGUNA',
    eclipseLabel: 'ALMYRKVI SÓLAR',
    eclipseStats: '12. ágúst 2026 &middot; ~17:45 UTC &middot; Vestur-Ísland',
  },
}

const PURCHASE_STRINGS: Record<EmailLocale, {
  subject: string
  heading: string
  body: string
  cta: string
  saveLabel: string
  saveBody: string
  saveFooter: string
  eclipseLabel: string
  eclipseStats: string
}> = {
  en: {
    subject: 'You\'re in — EclipseChase Pro is active',
    heading: 'You\'re in. Pro is active.',
    body:
      'Thanks for backing EclipseChase. Your Pro access is unlocked on the device you used to purchase &mdash; the live weather map, personalized spot recommendations, and offline mode are ready to go.',
    cta: 'OPEN DASHBOARD',
    saveLabel: 'SAVE THIS EMAIL',
    saveBody:
      'To use Pro on another device (or if you clear your browser data), open <a href="https://eclipsechase.is/pro" style="color:#f59e0b;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">eclipsechase.is/pro</a>, click <strong style="color:#f1f5f9;">Restore here</strong>, and enter the address this email was sent to. We\'ll email you a 6-digit code to unlock Pro again.',
    saveFooter: 'Stripe sent a separate payment receipt for your records.',
    eclipseLabel: 'TOTAL SOLAR ECLIPSE',
    eclipseStats: 'August 12, 2026 &middot; ~17:45 UTC &middot; Western Iceland',
  },
  is: {
    subject: 'Þú ert kominn inn — EclipseChase Pro er virkt',
    heading: 'Þú ert kominn inn. Pro er virkt.',
    body:
      'Takk fyrir að styðja EclipseChase. Pro-aðgangurinn þinn er opnaður á tækinu sem þú notaðir við kaupin &mdash; lifandi veðurkortið, persónulegar tillögur um áhorfsstaði og ónettengda stillingin eru tilbúin.',
    cta: 'OPNA MÆLABORÐ',
    saveLabel: 'GEYMDU ÞENNAN TÖLVUPÓST',
    saveBody:
      'Til að nota Pro á öðru tæki (eða ef þú hreinsar vafragögnin þín), opnaðu <a href="https://eclipsechase.is/is/pro" style="color:#f59e0b;text-decoration:none;border-bottom:1px solid rgba(245,158,11,0.3);">eclipsechase.is/is/pro</a>, smelltu á <strong style="color:#f1f5f9;">Endurheimta hér</strong> og settu inn netfangið sem þessi tölvupóstur var sendur á. Við sendum þér 6 stafa kóða til að opna Pro aftur.',
    saveFooter: 'Stripe sendi sérstaka greiðslukvittun til þín.',
    eclipseLabel: 'ALMYRKVI SÓLAR',
    eclipseStats: '12. ágúst 2026 &middot; ~17:45 UTC &middot; Vestur-Ísland',
  },
}

const RESTORE_STRINGS: Record<EmailLocale, {
  subject: string
  intro: string
  expiry: string
}> = {
  en: {
    subject: 'Your EclipseChase.is restore code',
    intro: 'Your restore code is:',
    expiry:
      'Enter this code in the app within 15 minutes. If you didn\'t request this, you can ignore this email.',
  },
  is: {
    subject: 'Endurheimtukóði fyrir EclipseChase.is',
    intro: 'Endurheimtukóði þinn er:',
    expiry:
      'Sláðu þennan kóða inn í appið innan 15 mínútna. Ef þú baðst ekki um þetta, geturðu hunsað þennan tölvupóst.',
  },
}

/* ────────────────────────────────────────────────────────────────
   Locale-aware send functions. Each accepts an optional `locale`;
   anything other than 'is' falls back to English.
   ──────────────────────────────────────────────────────────────── */

export async function sendWelcomeEmail(to: string, locale?: string | null) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping welcome email to', maskEmail(to))
    return
  }

  const lang = resolveLocale(locale)
  const s = WELCOME_STRINGS[lang]

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: s.subject,
      html: welcomeHtml(lang),
    })
    console.log(`[email] Welcome email (${lang}) sent to`, maskEmail(to))
  } catch (err: any) {
    // Don't throw — email failure shouldn't block signup
    console.error('[email] Failed to send welcome email to', maskEmail(to), ':', err.message || err)
  }
}

export async function sendPurchaseEmail(to: string, locale?: string | null) {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping purchase email to', maskEmail(to))
    return
  }

  const lang = resolveLocale(locale)
  const s = PURCHASE_STRINGS[lang]

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: s.subject,
      html: purchaseHtml(lang),
    })
    console.log(`[email] Purchase email (${lang}) sent to`, maskEmail(to))
  } catch (err: any) {
    console.error('[email] Failed to send purchase email to', maskEmail(to), ':', err.message || err)
  }
}

export async function sendRestoreCode(to: string, code: string, locale?: string | null): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.log('[email] Resend not configured, skipping restore code to', maskEmail(to))
    return
  }

  const lang = resolveLocale(locale)
  const s = RESTORE_STRINGS[lang]

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: s.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; background: #050810; padding: 32px 24px;">
          ${brandHeaderHtml()}
          <p style="color: #94a3b8; font-size: 15px;">${s.intro}</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px;
                      background: #1a2232; color: #f59e0b; padding: 16px 24px;
                      border-radius: 8px; text-align: center; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">${s.expiry}</p>
        </div>
      `,
    })
    console.log(`[email] Restore code (${lang}) sent to`, maskEmail(to))
  }
  catch (err: any) {
    console.error('[email] Failed to send restore code to', maskEmail(to), ':', err.message || err)
  }
}

/* ────────────────────────────────────────────────────────────────
   HTML layout helpers — shared chrome, locale-driven content.
   ──────────────────────────────────────────────────────────────── */

function brandHeaderHtml(): string {
  return `
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://eclipsechase.is/email/brand-icon.png" width="22" height="22" alt="" style="vertical-align:middle;display:inline-block;border:0;outline:0;">
      <span style="vertical-align:middle;margin-left:10px;font-size:14px;font-weight:600;color:#f1f5f9;letter-spacing:2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">ECLIPSECHASE</span>
    </div>`
}

function htmlLangAttr(locale: EmailLocale): string {
  return locale === 'is' ? 'is' : 'en'
}

function purchaseHtml(locale: EmailLocale): string {
  const s = PURCHASE_STRINGS[locale]
  const dashboardUrl = locale === 'is'
    ? 'https://eclipsechase.is/is/dashboard'
    : 'https://eclipsechase.is/dashboard'

  return `
<!DOCTYPE html>
<html lang="${htmlLangAttr(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    ${brandHeaderHtml()}

    <!-- Body -->
    <div style="background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:32px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#f1f5f9;">
        ${s.heading}
      </h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94a3b8;">
        ${s.body}
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${dashboardUrl}"
           style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#050810;font-size:14px;font-weight:600;text-decoration:none;border-radius:3px;letter-spacing:0.03em;">
          ${s.cta}
        </a>
      </div>
    </div>

    <!-- Save this email -->
    <div style="margin-top:24px;background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#f59e0b;margin-bottom:12px;">
        ${s.saveLabel}
      </div>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#94a3b8;">
        ${s.saveBody}
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        ${s.saveFooter}
      </p>
    </div>

    <!-- Eclipse stats -->
    <div style="margin-top:24px;padding:16px;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;margin-bottom:8px;">
        ${s.eclipseLabel}
      </div>
      <div style="font-size:13px;color:#94a3b8;">
        ${s.eclipseStats}
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

function welcomeHtml(locale: EmailLocale): string {
  const s = WELCOME_STRINGS[locale]
  const guideUrl = locale === 'is'
    ? 'https://eclipsechase.is/is/guide'
    : 'https://eclipsechase.is/guide'

  return `
<!DOCTYPE html>
<html lang="${htmlLangAttr(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    ${brandHeaderHtml()}

    <!-- Body -->
    <div style="background:#0a1020;border:1px solid #1a2540;border-radius:6px;padding:32px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#f1f5f9;">
        ${s.heading}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94a3b8;">
        ${s.body1}
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94a3b8;">
        ${s.body2}
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${guideUrl}"
           style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#050810;font-size:14px;font-weight:600;text-decoration:none;border-radius:3px;letter-spacing:0.03em;">
          ${s.cta}
        </a>
      </div>
    </div>

    <!-- Eclipse stats -->
    <div style="margin-top:24px;padding:16px;text-align:center;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#475569;margin-bottom:8px;">
        ${s.eclipseLabel}
      </div>
      <div style="font-size:13px;color:#94a3b8;">
        ${s.eclipseStats}
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
