// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
console.log('=== SENTRY SETUP: NODE_ENV ====', process.env.NODE_ENV)
if (process.env.NODE_ENV == 'production') {
  Sentry.init({
    dsn: 'https://47c66bd7a6d64db68a59c03f2337e475@o4504088793841664.ingest.sentry.io/4505527493328896',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true,
  })
} else {
  console.log(
    '=== SENTRY SETUP: NODE_ENV is not set to production',
    process.env.NODE_ENV,
  )
}
