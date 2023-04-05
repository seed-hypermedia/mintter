import {join} from 'node:path'
import {app, BrowserWindow, ipcMain} from 'electron'
import MenuBuilder from './menu'

let windows = new Set()

const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
  process.exit(0)
}

export async function createWindow(url?: string) {
  let x, y
  const currentWindow = BrowserWindow.getFocusedWindow()

  if (currentWindow) {
    const [currentWindowX, currentWindowY] = currentWindow.getPosition()
    x = currentWindowX + 40
    y = currentWindowY + 40
  }

  let newWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 768,
    x,
    y,
    trafficLightPosition: {x: 16, y: 16},
    webPreferences: {
      webviewTag: false,
      // Electron current directory will be at `dist/main`, we need to include
      // the preload script from this relative path: `../preload/index.cjs`.
      preload: join(__dirname, '../preload/index.cjs'),
    },
  })

  newWindow.on('closed', () => {
    windows.delete(newWindow)
    newWindow = null
  })

  // If you install `show: true` then it can cause issues when trying to close the window.
  // Use `show: false` and listener events `ready-to-show` to fix these issues.
  // https://github.com/electron/electron/issues/25012
  newWindow.on('ready-to-show', () => {
    newWindow?.show()
  })

  // Define the URL to use for the `BrowserWindow`, depending on the DEV env.
  const pageUrl = import.meta.env.DEV
    ? `http://localhost:5173${url}`
    : new URL('../dist/renderer/index.html', `file://${__dirname}`).toString()

  await newWindow.loadURL(pageUrl)

  newWindow.webContents.on('did-finish-load', () => {
    if (!newWindow) {
      throw new Error('"newWindow" is not defined')
    }
    if (process.env.START_MINIMIZED) {
      newWindow.minimize()
    } else {
      newWindow.show()
      newWindow.focus()
    }
  })

  newWindow.on('closed', () => {
    windows.delete(newWindow)
    newWindow = null
  })

  newWindow.on('focus', () => {
    const menuBuilder = new MenuBuilder(newWindow)
    menuBuilder.buildMenu()
  })

  windows.add(newWindow)

  return newWindow
}

// app.on("second-instance", () => {
// 	createWindow().catch((err) =>
// 		console.error(
// 			"Error while trying to prevent second-instance Electron event:",
// 			err,
// 		),
// 	);
// });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (windows.size === 0) {
    createWindow('/').catch((err) =>
      console.error(
        'Error while trying to handle activate Electron event:',
        err,
      ),
    )
  }
})

app
  .whenReady()
  .then(() => {
    ipcMain.handle('new-window', async (channel, url) => {
      let w = getWindowByUrl(url)
      if (!w) {
        createWindow(url)
      } else {
        w.show()
        w.focus()
      }
    })

    ipcMain.handle('print-sender-id', (event) => {
      return event.sender.id
    })

    handleMouse()

    createWindow('/')
  })
  .catch((e) => console.error('Failed to create window:', e))

function getWindowByUrl(url?: string) {
  let prefix = import.meta.env.DEV
    ? 'http://localhost:5173'
    : new URL('../dist/renderer/index.html', `file://${__dirname}`).toString()
  if (!url) return
  return BrowserWindow.getAllWindows().find(
    (win) => win.webContents.getURL() === `${prefix}${url}`,
  )
}

function handleMouse() {
  ipcMain.handle('send-coords', (event, coords) => {
    // let wins = BrowserWindow.getAllWindows().filter(win => event.sender.id !== win.webContents.id)
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send('set-coords', coords),
    )
  })
}
