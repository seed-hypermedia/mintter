import {app, BrowserWindow, session, ipcMain, nativeTheme, Menu} from 'electron'
import path from 'path'
import * as Sentry from '@sentry/electron/main'
import os from 'os'
import {mainMenu, trpc} from './api'
import {mainDaemon} from './daemon'
import {saveCidAsFile} from './save-cid-as-file'

mainDaemon

Menu.setApplicationMenu(mainMenu)

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
      '/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoieni',
    )

    app.whenReady().then(async () => {
      try {
        await session.defaultSession.loadExtension(reactDevToolsPath)
      } catch (error) {
        console.error(
          '[REACT-DEVTOOLS]: error. no react devtools extension found',
        )
      }
    })
  }
}

// dark mode support: https://www.electronjs.org/docs/latest/tutorial/dark-mode
ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light'
  } else {
    nativeTheme.themeSource = 'dark'
  }
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system'
})

ipcMain.on('save-file', saveCidAsFile)

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
