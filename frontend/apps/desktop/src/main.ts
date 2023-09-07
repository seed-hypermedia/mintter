import * as Sentry from '@sentry/electron/main'
import {BrowserWindow, Menu, app, ipcMain, nativeTheme, shell} from 'electron'
import log from 'electron-log/main'
// import updater from 'update-electron-app'
import squirrelStartup from 'electron-squirrel-startup'
import {mainMenu, trpc} from './api'
import {mainDaemon} from './daemon'
import {saveCidAsFile} from './save-cid-as-file'
import {openLink} from './open-link'

if (squirrelStartup) {
  app.quit()
}

mainDaemon

Menu.setApplicationMenu(mainMenu)

// // check for updates Powered by the free and open-source
// updater({
//   updateInterval: '1 hour',
//   repo: 'mintterteam/mintter',
// })

//Simple logging module Electron/Node.js/NW.js application. No dependencies. No complicated configuration.
log.initialize({
  preload: true,
  // It makes a renderer logger available trough a global electronLog instance
  spyRendererConsole: true,
})

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
  log.debug('[MAIN]: App active')
})
app.on('did-resign-active', () => {
  log.debug('[MAIN]: App no longer active')
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

app.on('ready', () => {
  log.debug('[MAIN]: APP ready')
  // openInitialWindows()
  trpc.createAppWindow({
    route: {key: 'home'},
  })
})

app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    log.debug('[MAIN]: window-all-closed!!')
    app.quit()
  }
})

app.on('activate', () => {
  log.debug('[MAIN]: APP Active')
  if (BrowserWindow.getAllWindows().length === 0) {
    log.debug('[MAIN]: will open the home window')
    trpc.createAppWindow({
      route: {key: 'home'},
    })
  }
})
