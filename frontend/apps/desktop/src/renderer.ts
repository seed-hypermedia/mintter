/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import * as Sentry from '@sentry/electron/renderer'
import {IS_PROD_DESKTOP} from '@shm/shared'

import './root.tsx'

if (IS_PROD_DESKTOP) {
  Sentry.init({
    dsn: import.meta.env.VITE_DESKTOP_SENTRY_DSN,
    release: import.meta.env.VITE_VERSION,
    environment: import.meta.env.MODE,
    debug: false,
    integrations: [new Sentry.Replay(), new Sentry.BrowserTracing()],
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.25,
    tracePropagationTargets: ['localhost', /^https:\/\/hyper\.media\//],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    // The maximum number of days to keep an event in the queue.
    maxQueueAgeDays: 30,
    // The maximum number of events to keep in the queue.
    maxQueueCount: 30,
    // Called every time the number of requests in the queue changes.
    // queuedLengthChanged: (length) => {},
    // Called before attempting to send an event to Sentry. Used to override queuing behavior.
    //
    // Return 'send' to attempt to send the event.
    // Return 'queue' to queue and persist the event for sending later.
    // Return 'drop' to drop the event.
    // beforeSend: (request) => (isOnline() ? 'send' : 'queue'),
  })
}
// setTimeout(() => {
//   throw new Error('Some renderer error')
// }, 500)
