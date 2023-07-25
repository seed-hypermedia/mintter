import {app, BrowserWindow} from 'electron'
import path from 'path'
import * as Sentry from '@sentry/electron/main'
import {mainDaemon} from './daemon'

mainDaemon.grpcPort

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
}
// const squirrelStartup = import('electron-squirrel-startup')

// // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (squirrelStartup) {
//   app.quit()
// }

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // webPreferences: {
    //   preload: path.join(__dirname, 'preload.js'),
    // },
    icon: import.meta.env.RELEASE_NIGHTLY
      ? path.resolve(__dirname, '../assets/icons-nightly/icon.png')
      : path.resolve(__dirname, '../assets/icons/icon.png'),
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 12,
      y: 12,
    },
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('== LOAD APP', mainWindow)
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    )
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
