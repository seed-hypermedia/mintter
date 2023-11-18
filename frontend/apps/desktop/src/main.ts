import {IS_PROD_DESKTOP, MINTTER_SENTRY_DESKTOP_DSN} from '@mintter/shared'
import * as Sentry from '@sentry/electron/main'
import {BrowserWindow, Menu, app, ipcMain, nativeTheme, shell} from 'electron'
import log from 'electron-log/main'
import squirrelStartup from 'electron-squirrel-startup'
import path from 'node:path'
import {
  handleSecondInstance,
  handleUrlOpen,
  openInitialWindows,
  trpc,
} from './app-api'
import {createAppMenu} from './app-menu'
import {initPaths} from './app-paths'
import autoUpdate from './auto-update'
import {startMainDaemon} from './daemon'
import {saveCidAsFile} from './save-cid-as-file'

const OS_REGISTER_SCHEME = 'hm'

if (IS_PROD_DESKTOP) {
  if (squirrelStartup) {
    app.quit()
  }

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(OS_REGISTER_SCHEME, process.execPath, [
        path.resolve(process.argv[1]!),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(OS_REGISTER_SCHEME)
  }
}

initPaths()

startMainDaemon()

Menu.setApplicationMenu(createAppMenu())

autoUpdate()

//Simple logging module Electron/Node.js/NW.js application. No dependencies. No complicated configuration.
log.initialize({
  preload: true,
  // It makes a renderer logger available trough a global electronLog instance
  spyRendererConsole: true,
})

if (IS_PROD_DESKTOP) {
  Sentry.init({
    debug: true,
    dsn: MINTTER_SENTRY_DESKTOP_DSN,
    transportOptions: {
      // The maximum number of days to keep an event in the queue.
      maxQueueAgeDays: 30,
      // The maximum number of events to keep in the queue.
      maxQueueCount: 30,
      // Called every time the number of requests in the queue changes.
      queuedLengthChanged: (length) => {
        log.debug('[MAIN]: Sentry queue changed', length)
      },
      // Called before attempting to send an event to Sentry. Used to override queuing behavior.
      //
      // Return 'send' to attempt to send the event.
      // Return 'queue' to queue and persist the event for sending later.
      // Return 'drop' to drop the event.
      // beforeSend: (request) => (isOnline() ? 'send' : 'queue'),
    },
  })
}

app.on('did-become-active', () => {
  log.debug('[MAIN]: Mintter active')
})
app.on('did-resign-active', () => {
  log.debug('[MAIN]: Mintter no longer active')
})

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
ipcMain.on('open-external-link', (_event, linkUrl) => {
  shell.openExternal(linkUrl)
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  log.debug('[MAIN]: Another Mintter already running. Quitting..')
  app.quit()
} else {
  app.on('ready', () => {
    log.debug('[MAIN]: Mintter ready')
    openInitialWindows()
  })
  app.on('second-instance', handleSecondInstance)

  app.on('window-all-closed', () => {
    log.debug('[MAIN]: window-all-closed')
    if (process.platform != 'darwin') {
      log.debug('[MAIN]: will quit the app')
      app.quit()
    }
  })
  app.on('open-url', (_event, url) => {
    handleUrlOpen(url)
  })
  app.on('activate', () => {
    log.debug('[MAIN]: Mintter Active')
    if (BrowserWindow.getAllWindows().length === 0) {
      log.debug('[MAIN]: will open the home window')
      trpc.createAppWindow({
        routes: [{key: 'home'}],
      })
    }
  })
}
