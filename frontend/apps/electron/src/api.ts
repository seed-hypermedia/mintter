import z from 'zod'
import {initTRPC} from '@trpc/server'
import {observable} from '@trpc/server/observable'
// import {EventEmitter} from 'events'
import superjson from 'superjson'
import {BrowserWindow, Menu, MenuItem, ipcMain} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'

const t = initTRPC.create({isServer: true, transformer: superjson})

let windowIdCount = 1

const allWindows = new Map<string, BrowserWindow>()

let focusedWindow: string | null = null

function getFocusedWindow(): BrowserWindow | null {
  return focusedWindow ? allWindows[focusedWindow] : null
}

function windowFocused(windowId: string) {
  focusedWindow = windowId
}
function windowBlurred(windowId: string) {
  if (focusedWindow === windowId) {
    focusedWindow = null
  }
}

const invalidationHandlers = new Set<(queryKey: any) => void>()

ipcMain.on('invalidate_queries', (_event, info) => {
  invalidationHandlers.forEach((handler) => handler(info))
})

ipcMain.on('open_quick_switcher', (_event, info) => {
  getFocusedWindow()?.webContents.send('open_quick_switcher')
})

export const mainMenu = new Menu()

type ReadyState = {t: 'ready'}
type ErrorState = {t: 'error'; message: string}
type StartupState = {t: 'startup'}
export type GoDaemonState = ReadyState | ErrorState | StartupState

let goDaemonState: GoDaemonState = {t: 'startup'}

export function updateGoDaemonState(state: GoDaemonState) {
  goDaemonState = state
  allWindows.forEach((window) => {
    window.webContents.send('goDaemonState', goDaemonState)
  })
}

mainMenu.append(
  new MenuItem({
    role: 'appMenu',
    label: 'Mintter',
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          trpc.createAppWindow({route: {key: 'settings'}})
        },
      },
      {
        label: 'Search / Open',
        accelerator: 'CmdOrCtrl+k',
        click: () => {
          getFocusedWindow()?.webContents.send('open_quick_switcher')
        },
      },
      {type: 'separator'},
      {role: 'services'},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideOthers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'},
    ],
  }),
)
mainMenu.append(new MenuItem({role: 'editMenu'}))
mainMenu.append(
  new MenuItem({
    id: 'viewMenu',
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forceReload'},
      {role: 'toggleDevTools'},
      {type: 'separator'},
      {
        id: 'route_pubs',
        label: 'Publications',
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          getFocusedWindow()?.webContents.send('open_route', {key: 'home'})
        },
      },
      {
        id: 'route_drafts',
        label: 'Drafts',
        accelerator: 'CmdOrCtrl+8',
        click: () => {
          getFocusedWindow()?.webContents.send('open_route', {key: 'drafts'})
        },
      },
      {
        id: 'route_connections',
        label: 'Connections',
        accelerator: 'CmdOrCtrl+9',
        click: () => {
          getFocusedWindow()?.webContents.send('open_route', {
            key: 'connections',
          })
        },
      },
      {type: 'separator'},
      {role: 'resetZoom'},
      {role: 'zoomIn'},
      {role: 'zoomOut'},
      {type: 'separator'},
      {role: 'togglefullscreen'},
    ],
  }),
)
// mainMenu.getMenuItemById('route_pubs').enabled = false

mainMenu.append(
  new MenuItem({
    role: 'windowMenu',
    submenu: [
      {
        role: 'close',
      },
      {
        role: 'minimize',
      },
    ],
  }),
)

export const router = t.router({
  createAppWindow: t.procedure
    .input(
      z
        .object({
          route: z.any(),
        })
        .optional(),
    )
    .mutation(async ({input}) => {
      const windowId = `Window${windowIdCount++}`
      const browserWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 800,

        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
        },
        icon: import.meta.env.RELEASE_NIGHTLY
          ? path.resolve(__dirname, '../assets/icons-nightly/icon.png')
          : path.resolve(__dirname, '../assets/icons/icon.png'),
        titleBarStyle: 'hidden',
        trafficLightPosition: {
          x: 12,
          y: 12,
        },
      })
      allWindows.set(windowId, browserWindow)
      trpcHandlers.attachWindow(browserWindow)
      browserWindow.webContents.send('initWindow', {
        route: input?.route,
        daemonState: goDaemonState,
        windowId,
      })
      browserWindow.webContents.on('did-finish-load', () => {
        browserWindow.webContents.send('initWindow', {
          route: input?.route,
          daemonState: goDaemonState,
          windowId,
        })
      })

      // First render trick: https://getlotus.app/21-making-electron-apps-feel-native-on-mac
      browserWindow.on('ready-to-show', () => {
        browserWindow.show()
      })

      browserWindow.on('close', () => {
        trpcHandlers.detachWindow(browserWindow)
        allWindows.delete(windowId)
      })

      browserWindow.on('focus', () => {
        windowFocused(windowId)
      })
      browserWindow.on('blur', () => {
        windowBlurred(windowId)
      })

      // and load the index.html of the app.
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        browserWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      } else {
        browserWindow.loadFile(
          path.join(
            __dirname,
            `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
          ),
        )
      }

      // if (!import.meta.env.PROD) browserWindow.webContents.openDevTools()
    }),

  queryInvalidation: t.procedure.subscription(() => {
    return observable((emit) => {
      function handler(value: any[]) {
        emit.next(value)
      }
      invalidationHandlers.add(handler)
      return () => {
        invalidationHandlers.delete(handler)
      }
    })
  }),
})

export const trpc = router.createCaller({})

const trpcHandlers = createIPCHandler({router, windows: []})

export type AppRouter = typeof router
