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
import {IS_PROD_DESKTOP} from '@mintter/shared'
import * as Sentry from '@sentry/electron/renderer'
import './root.tsx'

if (IS_PROD_DESKTOP) {
  Sentry.init({
    dsn: 'https://8d3089ffb71045dc911bc66efbd3463a@o4504088793841664.ingest.sentry.io/4505527460429824',
    debug: true,
  })
}
// setTimeout(() => {
//   throw new Error('Some renderer error')
// }, 500)
