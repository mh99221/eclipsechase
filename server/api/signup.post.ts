/**
 * RETIRED 2026-08-13.
 *
 * The Aug 12 2026 eclipse has passed and no further mail will ever be sent
 * from this list. The landing page no longer renders the signup form, but
 * the handler is kept (rather than deleted) so any stale client still
 * holding the old bundle gets an explicit, permanent 410 rather than a
 * confusing 404 — and, more importantly, so nothing can write a new row to
 * `email_signups` in a database that is about to be paused.
 *
 * See docs/superpowers/plans/2026-08-13-eclipsechase-sunset.md.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Eclipse updates are no longer sent',
  })
})
