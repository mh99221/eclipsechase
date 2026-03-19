# Legal Compliance Design Spec

**Date**: 2026-03-19
**Status**: Draft
**Author**: Claude + Martin

## Overview

EclipseChase.is has grown beyond its initial email-signup-only scope. The current privacy policy is outdated and incomplete. The app now processes payments (Stripe), sends transactional emails (Resend), uses authentication cookies (Supabase), caches pro status in cookies, loads anonymous analytics (Umami), renders maps (Mapbox), and links to external tools (PeakFinder). No Terms of Service or cookie consent mechanism exists.

This spec covers four deliverables to bring the site into full EU commercial compliance.

## Deliverables

### 1. Privacy Policy Rewrite (`/privacy`)

Full rewrite of the existing `app/pages/privacy.vue`. Same page design patterns (noise wrapper, nav, `section-container max-w-2xl`, footer). Update the "Last updated" date. Both legal pages use `max-w-2xl` (narrower than the usual `max-w-3xl` for better readability of legal text).

#### Sections

**1.1 Who we are**
Elite Consulting, s.r.o., registered in Slovakia (IČO and registered address to be added by the developer). Contact: privacy@eclipsechase.is. Operates EclipseChase.is to help visitors find clear skies for the August 12, 2026 total solar eclipse in Iceland.

**1.2 What data we collect**

| Data | When collected | Purpose | Legal basis (GDPR Art. 6) |
|------|---------------|---------|--------------------------|
| Email address | Signup for notifications | Launch notifications, eclipse updates | Consent (Art. 6(1)(a)) |
| Email address | Pro purchase, Magic Link auth | Purchase confirmation, authentication | Contract performance (Art. 6(1)(b)) |
| Payment data | Pro purchase | Processed entirely by Stripe — we store only email + Stripe session ID | Contract performance (Art. 6(1)(b)) |
| Pro purchase records | Pro purchase | Tax/accounting compliance (Slovak law, 10-year retention) | Legal obligation (Art. 6(1)(c)) |
| Anonymous usage data | Every page visit (if consented) | Umami analytics — page views, referrer, user agent, browser language. No IP addresses stored, no cookies set by Umami | Consent (Art. 6(1)(a)) |
| Device location | Only if user grants GPS permission | Show user's position on the map. Never stored server-side, never transmitted to us | Consent (Art. 6(1)(a)) |
| Server logs (IP, user agent) | Every HTTP request | Collected automatically by Vercel as part of hosting infrastructure. Not accessed or processed by the operator. Governed by Vercel's DPA. | Legitimate interest (Art. 6(1)(f)) |

**1.3 Cookies & local storage**

| Name | Type | Duration | Purpose | Consent required |
|------|------|----------|---------|-----------------|
| Supabase auth session | Cookie | Session | Authentication for Pro users via Magic Link | No (strictly necessary) |
| `eclipsechase-pro` | Cookie | 30 days | Caches Pro purchase status for offline access | No (strictly necessary) |
| `eclipsechase-consent` | localStorage | Persistent | Stores user's cookie/analytics consent choice | No (consent mechanism itself) |
| Service Worker cache | Cache API | Varies | Offline access to map tiles, API responses, static pages | No (strictly necessary for PWA) |

Note: Umami analytics does NOT set any cookies. It collects anonymous page view data only if the user consents via our cookie banner.

**1.4 Third-party services**

| Service | Data shared | Purpose | Privacy policy |
|---------|------------|---------|---------------|
| **Supabase** (EU) | Email, auth tokens, purchase records | Database hosting, authentication | supabase.com/privacy |
| **Vercel** (US, EU CDN) | HTTP requests, IP (in server logs) | Application hosting | vercel.com/legal/privacy-policy |
| **Stripe** (US) | Email, payment card details | Payment processing for Pro tier | stripe.com/privacy |
| **Resend** (US) | Email address | Transactional email delivery (welcome email) | resend.com/legal/privacy-policy |
| **Mapbox** (US) | Tile requests (no personal data) | Map rendering | mapbox.com/legal/privacy |
| **Umami Cloud** (EU) | Anonymous page views, referrer, user agent | Privacy-friendly analytics (hosted by Umami, cloud.umami.is) | umami.is/privacy |
| **PeakFinder** (external link) | Coordinates passed in URL (user-initiated) | Horizon obstruction visualization | User navigates to peakfinder.com voluntarily |

**1.5 How we use your data**
- Email addresses: send launch notifications, eclipse updates, purchase confirmations, and Magic Link authentication emails
- Payment records: fulfill Pro tier access and comply with Slovak tax/accounting requirements
- Analytics: understand which pages are useful, improve the app. No personal data, no profiling
- We never sell, rent, or share personal data with third parties for marketing

**1.6 Data retention**
- Email signups: retained until user unsubscribes or requests deletion
- Pro purchase records: retained for 10 years (Slovak accounting law requirement)
- Authentication sessions: expire automatically, cleared on logout
- Weather/road data: transient server-side cache, refreshed every 15 minutes, no personal data
- Analytics: aggregated anonymous data, no personal data retained
- Server logs: retained by Vercel per their data processing agreement (typically 30 days). We do not independently store server logs.

**1.7 Your rights (GDPR)**
- Access the personal data we hold about you
- Request correction of inaccurate data
- Request deletion of your data (subject to legal retention requirements)
- Restrict processing of your data
- Object to processing of your data
- Data portability — receive your data in a structured, machine-readable format
- Withdraw consent for analytics at any time (via cookie banner)
- Lodge a complaint with your local data protection authority
- Contact: privacy@eclipsechase.is

**1.8 International data transfers**
Your data may be processed by US-based services (Stripe, Resend, Vercel, Mapbox). These providers participate in EU-US Data Privacy Framework and/or use Standard Contractual Clauses to ensure adequate data protection.

**1.9 Changes to this policy**
We may update this policy. Material changes will be communicated via the website. The "Last updated" date at the top reflects the most recent revision.

---

### 2. Terms of Service (`/terms`)

New page at `app/pages/terms.vue`. Same design patterns as privacy page (noise wrapper, nav with ECLIPSECHASE logo, section-container max-w-2xl, footer with back link + cross-link to privacy).

#### Sections

**2.1 Agreement to terms**
By accessing or using EclipseChase.is, you agree to these terms. If you do not agree, do not use the service. You must be at least 18 years old or have parental/guardian consent.

**2.2 Description of service**
EclipseChase.is provides weather forecasts, location recommendations, and eclipse information to help users plan viewing of the August 12, 2026 total solar eclipse in Iceland. All information is for general guidance only and should not be relied upon as professional advice.

**2.3 Pro tier**
- One-time payment of €9.99 via Stripe for access to premium features (live weather map, recommendation engine)
- Digital content — by completing purchase, you expressly consent to immediate access and acknowledge that you waive your right of withdrawal under EU Consumer Rights Directive (Article 16(m))
- No refunds once access is granted
- Pricing may change for future purchases; existing purchases are unaffected
- Pro access is linked to your email address and is non-transferable

**UI requirement for `/pro` page**: Before the checkout button, display a mandatory checkbox:
> "I agree that my Pro access begins immediately and I waive my 14-day right of withdrawal. I have read the [Terms of Service](/terms) and [Privacy Policy](/privacy)."

The checkout button must be disabled until this checkbox is ticked. This is required under EU Consumer Rights Directive (Article 16(m)) to make the no-refund policy legally enforceable.

**2.4 Safety and liability disclaimer**
- EclipseChase.is provides informational guidance only, not professional meteorological, navigation, or safety advice
- Weather forecasts are sourced from vedur.is (Iceland Meteorological Office) and may be inaccurate, delayed, or incomplete
- Road condition data is sourced from Vegagerðin (Iceland Road Administration) and may not reflect real-time conditions
- **Users are solely responsible for their own safety**, including but not limited to:
  - Driving decisions and route planning on Icelandic roads
  - Checking official safety sources (safetravel.is, road.is) before traveling
  - Proper eye protection when viewing the eclipse (never look directly at the sun without certified solar filters)
  - Assessing local weather, terrain, and road conditions in person
- Icelandic roads and weather conditions can be hazardous, including single-lane roads, river crossings, sudden weather changes, and limited cell coverage
- We are not liable for any injury, loss, property damage, or other harm arising from reliance on information provided by the app

**2.5 Acceptable use**
- Do not scrape, crawl, or systematically extract data from the service
- Do not attempt to bypass Pro tier access controls
- Do not resell, redistribute, or share Pro access credentials
- Do not use the service for any unlawful purpose

**2.6 Intellectual property**
All content, design, code, eclipse computations, and data compilations on EclipseChase.is are the property of Elite Consulting, s.r.o. or its licensors. You may not reproduce, distribute, or create derivative works without written permission.

**2.7 Service availability**
- The service is provided "as is" and "as available" without warranties of any kind, express or implied
- We do not guarantee uninterrupted or error-free operation
- We may modify, suspend, or discontinue the service at any time without notice
- Offline features depend on prior caching and may not include the latest data

**2.8 Limitation of liability**
To the maximum extent permitted by applicable law:
- Our total liability for any claims arising from your use of the service is limited to the amount you paid (€9.99 for Pro, or €0 for free tier)
- We are not liable for any indirect, incidental, special, consequential, or punitive damages
- This includes, without limitation, loss of profits, data, or goodwill

**2.9 Governing law and jurisdiction**
These terms are governed by the laws of the Slovak Republic. Any disputes shall be resolved by the courts of Bratislava, Slovakia. This does not affect your mandatory consumer rights under the laws of your country of residence.

**2.10 Changes to terms**
We may update these terms. Material changes will be notified via email to Pro users and posted on the website. Continued use after changes constitutes acceptance.

**2.11 Contact**
For questions about these terms, contact us at privacy@eclipsechase.is.

---

### 3. Cookie Consent Banner (`CookieConsent.vue`)

New component at `app/components/CookieConsent.vue`.

#### Behavior

- Renders only on client side (wrap in `<ClientOnly>` or use `onMounted` check)
- On mount, checks `localStorage.getItem('eclipsechase-consent')`
  - If value exists (`"all"` or `"essential"`): don't show banner
  - If no value: show banner
- **"Accept all" button**: sets `localStorage` to `"all"`, hides banner, enables Umami
- **"Essential only" button**: sets `localStorage` to `"essential"`, hides banner, Umami stays disabled
- No dismiss-on-scroll or auto-accept — user must make an explicit choice

#### Design

- Fixed to bottom of viewport (`fixed bottom-0 inset-x-0 z-50`)
- `bg-void-surface border-t border-void-border/40`
- Single row on desktop, stacked on mobile
- Text: `"We use essential cookies for authentication. We also use Umami for anonymous analytics, which requires your consent."` + link to `/privacy`
- Two buttons:
  - "Accept all" — `bg-corona text-void font-mono text-xs uppercase tracking-wider px-4 py-2 rounded`
  - "Essential only" — `border border-void-border text-slate-400 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded`

#### Umami Integration Change

Currently Umami is loaded unconditionally in `nuxt.config.ts` via the `head.script` array. This must change:

- Remove Umami from the static `head.script` config in `nuxt.config.ts`
- Create a composable `useAnalyticsConsent.ts` that:
  - Reads consent state from localStorage
  - Provides a `loadUmami()` function that dynamically injects the Umami script tag using `runtimeConfig.public.umamiHost` and `runtimeConfig.public.umamiWebsiteId` (already configured in nuxt.config.ts)
  - Provides a reactive `hasConsent` ref
- In `app.vue`, call `loadUmami()` on mount if consent is `"all"`
- The CookieConsent component calls `loadUmami()` immediately when user clicks "Accept all"

This ensures Umami never loads before consent is given.

---

### 4. Footer Updates

Update the footer on all pages to include links to Privacy and Terms.

#### Pages to update

1. `app/pages/index.vue` — landing page
2. `app/pages/guide.vue`
3. `app/pages/pro.vue`
4. `app/pages/privacy.vue`
5. `app/pages/terms.vue` (new)
6. `app/pages/spots/[slug].vue`
7. `app/pages/map.vue`
8. `app/pages/recommend.vue`

#### Footer pattern

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; Back to home
    </NuxtLink>
    <div class="flex gap-4">
      <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        Privacy
      </NuxtLink>
      <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        Terms
      </NuxtLink>
    </div>
  </div>
</footer>
```

Exceptions:
- On the landing page (`index.vue`), the footer has a different layout (branded with logo + tagline) — adapt to existing structure but ensure both links are present.
- On the map page (`map.vue`), there is no footer (full-screen map layout). Legal links will be added to a map overlay or settings panel in a future iteration.

---

## Out of Scope

- Accessibility statement (separate initiative)
- GDPR Record of Processing Activities (internal document, not user-facing)
- Cookie settings/preferences page (overkill — users can clear localStorage)
- Separate safety disclaimer page (embedded in ToS section 2.4)
- Cookie categories/granular controls (only two categories: essential + analytics)
- "Manage cookies" footer link to re-show banner (planned fast-follow, implement before launch: EDPB recommends withdrawal of consent should be as easy as giving it — add a small footer link that clears `eclipsechase-consent` from localStorage and re-shows the banner)

## Files Changed

| File | Action |
|------|--------|
| `app/pages/privacy.vue` | Rewrite |
| `app/pages/terms.vue` | New |
| `app/components/CookieConsent.vue` | New |
| `app/composables/useAnalyticsConsent.ts` | New |
| `app/app.vue` | Add CookieConsent component |
| `nuxt.config.ts` | Remove static Umami script, add `/terms` to `routeRules` with `prerender: true` |
| `app/pages/index.vue` | Footer update |
| `app/pages/guide.vue` | Footer update |
| `app/pages/pro.vue` | Footer update + add withdrawal waiver checkbox before checkout button |
| `app/pages/spots/[slug].vue` | Footer update |
| `app/pages/map.vue` | Footer update |
| `app/pages/recommend.vue` | Footer update |
| `i18n/en.json` | Add legal page strings (if needed) |
| `i18n/is.json` | Add legal page strings (if needed) |

## i18n Note

The privacy policy and terms of service will be in English only for the initial implementation. Icelandic translations can be added later but are not required for compliance (English is the primary language of the site, and the target audience is international tourists visiting Iceland).
