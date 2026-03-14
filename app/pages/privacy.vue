<script setup lang="ts">
useHead({
  title: 'Privacy Policy — EclipseChase.is',
  meta: [
    { name: 'description', content: 'Privacy policy for EclipseChase.is — how we handle your data.' },
  ],
})
</script>

<template>
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-6 sm:px-10 py-5">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <svg class="w-7 h-7" viewBox="0 0 128 128" fill="none">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-sm tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
    </nav>

    <!-- Content -->
    <article class="section-container max-w-2xl py-12 sm:py-20">
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
        Privacy Policy
      </h1>
      <p class="text-sm font-mono text-slate-500 mb-10">
        Last updated: March 14, 2026
      </p>

      <div class="space-y-8 text-base text-slate-300 leading-relaxed">
        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">Who we are</h2>
          <p>
            EclipseChase.is is operated by Elite Consulting, s.r.o., an IT consulting company registered in Slovakia. We built this app to help visitors find clear skies for the August 12, 2026 total solar eclipse in Iceland.
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">What data we collect</h2>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li>
              <strong class="text-slate-200">Email address</strong> — when you sign up for launch notifications. We store this in our database (hosted on Supabase) solely to send you updates about EclipseChase.is.
            </li>            
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">What we don't collect</h2>
          <p>
            We do not use tracking cookies, advertising networks, or third-party analytics that identify you.
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">How we use your data</h2>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li>Email addresses are used only to send you launch notifications and eclipse-related updates.</li>
            <li>We will never sell, rent, or share your email with third parties.</li>
            <li>You can unsubscribe at any time by replying to any email or contacting us directly.</li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">Where your data is stored</h2>
          <p>
            Your data is stored on Supabase (cloud infrastructure in the EU region) and the application is hosted on Vercel. Both providers comply with GDPR requirements.
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">Your rights (GDPR)</h2>
          <p>
            Under the General Data Protection Regulation, you have the right to:
          </p>
          <ul class="list-disc list-outside ml-5 space-y-2 mt-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent at any time</li>
            <li>Lodge a complaint with your local data protection authority</li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">Third-party services</h2>
          <ul class="list-disc list-outside ml-5 space-y-2">
            <li><strong class="text-slate-200">Supabase</strong> — database hosting (stores email signups)</li>
            <li><strong class="text-slate-200">Vercel</strong> — application hosting</li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3">Contact</h2>
          <p>
            For any privacy-related questions or data requests, contact us at <a href="mailto:privacy@eclipsechase.is" class="text-corona hover:text-corona-bright transition-colors">
              privacy@eclipsechase.is
            </a>
          </p>
        </section>
      </div>
    </article>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
