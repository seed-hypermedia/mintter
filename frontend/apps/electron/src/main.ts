import {app, BrowserWindow, session} from 'electron'
import path from 'path'
import * as Sentry from '@sentry/electron/main'
import os from 'os'
import {router} from './api'
import {mainDaemon} from './daemon'

mainDaemon

const trpc = router.createCaller({})

if (import.meta.env.PROD) {
  Sentry.init({
    debug: true,
    dsn: import.meta.env.VITE_MINTTER_SENTRY_DESKTOP,
    transportOptions: {
      // The maximum number of days to keep an event in the queue.
      maxQueueAgeDays: 30,
      // The maximum number of events to keep in the queue.
      maxQueueCount: 30,
      // Called every time the number of requests in the queue changes.
      queuedLengthChanged: (length) => {
        console.log('Sentry queue changed', length)
      },
      // Called before attempting to send an event to Sentry. Used to override queuing behavior.
      //
      // Return 'send' to attempt to send the event.
      // Return 'queue' to queue and persist the event for sending later.
      // Return 'drop' to drop the event.
      // beforeSend: (request) => (isOnline() ? 'send' : 'queue'),
    },
  })
} else {
  // on macOS
  if (os.platform() == 'darwin') {
    const reactDevToolsPath = path.join(
      os.homedir(),
      '/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi',
    )

    console.log(`== ~ reactDevToolsPath:`, reactDevToolsPath)
    app.whenReady().then(async () => {
      await session.defaultSession.loadExtension(reactDevToolsPath)
    })
  }
}

app.on('ready', () => {
  trpc.createAppWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    trpc.createAppWindow()
  }
})
