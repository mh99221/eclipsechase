<script setup lang="ts">
useHead({
  title: 'Privacy Policy',
  meta: [
    { name: 'description', content: 'Privacy policy for EclipseChase.is — how we handle your data.' },
  ],
})
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <!-- Content -->
    <article class="section-container max-w-2xl py-12 sm:py-20">
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink-1 mb-2">
        Privacy Policy
      </h1>
      <p class="text-sm font-mono text-ink-3 mb-10">
        Last updated: March 19, 2026
      </p>

      <div class="space-y-10 text-base text-ink-2 leading-relaxed">

        <!-- 1.1 Who we are -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.1 Who we are</h2>
          <p>
            EclipseChase.is is operated by Elite Consulting, s.r.o., registered in Slovakia ([IČO], [Address]). Contact: <a href="mailto:privacy@eclipsechase.is" class="text-accent hover:text-accent-strong transition-colors">privacy@eclipsechase.is</a>. We built this app to help visitors find clear skies for the August 12, 2026 total solar eclipse in Iceland.
          </p>
        </section>

        <!-- 1.2 What data we collect -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.2 What data we collect</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left mt-3">
              <thead class="text-xs font-mono uppercase tracking-wider text-ink-3 border-b border-border-subtle/60">
                <tr>
                  <th class="py-2 pr-4">Data</th>
                  <th class="py-2 pr-4">When collected</th>
                  <th class="py-2 pr-4">Purpose</th>
                  <th class="py-2 pr-4">Legal basis (GDPR Art. 6)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Email address</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Signup for notifications</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Launch notifications, eclipse updates</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Consent (Art. 6(1)(a))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Email address</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Pro purchase, Magic Link auth</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Purchase confirmation, authentication</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Contract performance (Art. 6(1)(b))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Payment data</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Pro purchase</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Processed entirely by Stripe — we store only email + Stripe session ID</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Contract performance (Art. 6(1)(b))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Pro purchase records</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Pro purchase</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Tax/accounting compliance (Slovak law, 10-year retention)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Legal obligation (Art. 6(1)(c))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Anonymous usage data</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Every page visit (if consented)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Umami analytics — page views, referrer, user agent, browser language. No IP addresses stored, no cookies set by Umami</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Consent (Art. 6(1)(a))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Device location</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Only if user grants GPS permission</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Show user's position on the map. Never stored server-side, never transmitted to us</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Consent (Art. 6(1)(a))</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Server logs (IP, user agent)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Every HTTP request</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Collected automatically by Vercel as part of hosting infrastructure. Not accessed or processed by the operator. Governed by Vercel's DPA.</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Legitimate interest (Art. 6(1)(f))</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 1.3 Cookies & local storage -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.3 Cookies &amp; local storage</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left mt-3">
              <thead class="text-xs font-mono uppercase tracking-wider text-ink-3 border-b border-border-subtle/60">
                <tr>
                  <th class="py-2 pr-4">Name</th>
                  <th class="py-2 pr-4">Type</th>
                  <th class="py-2 pr-4">Duration</th>
                  <th class="py-2 pr-4">Purpose</th>
                  <th class="py-2 pr-4">Consent required</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Supabase auth session</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Cookie</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Session</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Authentication for Pro users via Magic Link</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">No (strictly necessary)</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium"><code class="text-xs bg-surface px-1 py-0.5 rounded">eclipsechase-pro</code></td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Cookie</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">30 days</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Caches Pro purchase status for offline access</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">No (strictly necessary)</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium"><code class="text-xs bg-surface px-1 py-0.5 rounded">eclipsechase-consent</code></td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">localStorage</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Persistent</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Stores user's cookie/analytics consent choice</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">No (consent mechanism itself)</td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Service Worker cache</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Cache API</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Varies</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Offline access to map tiles, API responses, static pages</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">No (strictly necessary for PWA)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-sm text-ink-3">
            Note: Umami analytics does NOT set any cookies. It collects anonymous page view data only if the user consents via our cookie banner.
          </p>
        </section>

        <!-- 1.4 Third-party services -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.4 Third-party services</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left mt-3">
              <thead class="text-xs font-mono uppercase tracking-wider text-ink-3 border-b border-border-subtle/60">
                <tr>
                  <th class="py-2 pr-4">Service</th>
                  <th class="py-2 pr-4">Data shared</th>
                  <th class="py-2 pr-4">Purpose</th>
                  <th class="py-2 pr-4">Privacy policy</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Supabase (EU)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Email, auth tokens, purchase records</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Database hosting, authentication</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://supabase.com/privacy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">supabase.com/privacy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Vercel (US, EU CDN)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">HTTP requests, IP (in server logs)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Application hosting</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">vercel.com/legal/privacy-policy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Stripe (US)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Email, payment card details</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Payment processing for Pro tier</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://stripe.com/privacy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">stripe.com/privacy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Resend (US)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Email address</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Transactional email delivery (welcome email)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">resend.com/legal/privacy-policy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Mapbox (US)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Tile requests (no personal data)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Map rendering</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">mapbox.com/legal/privacy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">Umami Cloud (EU)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Anonymous page views, referrer, user agent</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Privacy-friendly analytics (hosted by Umami, cloud.umami.is)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2"><a href="https://umami.is/privacy" target="_blank" rel="noopener" class="text-accent hover:text-accent-strong transition-colors">umami.is/privacy</a></td>
                </tr>
                <tr class="border-b border-border-subtle/40">
                  <td class="py-2.5 pr-4 align-top text-ink-1 font-medium">PeakFinder (external link)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Coordinates passed in URL (user-initiated)</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">Horizon obstruction visualization</td>
                  <td class="py-2.5 pr-4 align-top text-ink-2">User navigates to peakfinder.com voluntarily</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 1.5 How we use your data -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.5 How we use your data</h2>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li>Email addresses: send launch notifications, eclipse updates, purchase confirmations, and Magic Link authentication emails</li>
            <li>Payment records: fulfill Pro tier access and comply with Slovak tax/accounting requirements</li>
            <li>Analytics: understand which pages are useful, improve the app. No personal data, no profiling</li>
            <li>We never sell, rent, or share personal data with third parties for marketing</li>
          </ul>
        </section>

        <!-- 1.6 Data retention -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.6 Data retention</h2>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li>Email signups: retained until user unsubscribes or requests deletion</li>
            <li>Pro purchase records: retained for 10 years (Slovak accounting law requirement)</li>
            <li>Authentication sessions: expire automatically, cleared on logout</li>
            <li>Weather/road data: transient server-side cache, refreshed every 15 minutes, no personal data</li>
            <li>Analytics: aggregated anonymous data, no personal data retained</li>
            <li>Server logs: retained by Vercel per their data processing agreement (typically 30 days). We do not independently store server logs.</li>
          </ul>
        </section>

        <!-- 1.7 Your rights (GDPR) -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.7 Your rights (GDPR)</h2>
          <p class="mb-3">Under the General Data Protection Regulation, you have the right to:</p>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal retention requirements)</li>
            <li>Restrict processing of your data</li>
            <li>Object to processing of your data</li>
            <li>Data portability — receive your data in a structured, machine-readable format</li>
            <li>Withdraw consent for analytics at any time (via cookie banner)</li>
            <li>Lodge a complaint with your local data protection authority</li>
          </ul>
          <p class="mt-4">
            To exercise any of these rights, contact us at <a href="mailto:privacy@eclipsechase.is" class="text-accent hover:text-accent-strong transition-colors">privacy@eclipsechase.is</a>.
          </p>
        </section>

        <!-- 1.8 International data transfers -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.8 International data transfers</h2>
          <p>
            Your data may be processed by US-based services (Stripe, Resend, Vercel, Mapbox). These providers participate in the EU–US Data Privacy Framework and/or use Standard Contractual Clauses to ensure adequate data protection.
          </p>
        </section>

        <!-- 1.9 Changes to this policy -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3">1.9 Changes to this policy</h2>
          <p>
            We may update this policy. Material changes will be communicated via the website. The "Last updated" date at the top reflects the most recent revision.
          </p>
        </section>

      </div>
    </article>

    <AppFooter />
  </div>
</template>
