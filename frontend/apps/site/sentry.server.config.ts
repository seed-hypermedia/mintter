// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
