// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

if (process.env.NODE_ENV == 'production') {
  Sentry.init({
    dsn: process.env.HM_SENTRY_SITE_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
} else {
  console.log(
    '=== SENTRY SETUP: NODE_ENV is not set to production',
    process.env.NODE_ENV,
  )
}
