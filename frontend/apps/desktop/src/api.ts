import z from 'zod'
import {initTRPC} from '@trpc/server'
import {observable} from '@trpc/server/observable'
// import {EventEmitter} from 'events'
import superjson from 'superjson'
import {app} from 'electron'
import {BrowserWindow, Menu, MenuItem, ipcMain} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'
import Store from 'electron-store'
import {NavRoute} from '@mintter/app/src/utils/navigation'
import {childLogger, error, log} from './logger'

const t = initTRPC.create({isServer: true, transformer: superjson})

let windowIdCount = 1

const allWindows = new Map<string, BrowserWindow>()

let focusedWindowKey: string | null = null

function getFocusedWindow(): BrowserWindow | null | undefined {
  return focusedWindowKey ? allWindows.get(focusedWindowKey) : null
}

function windowFocused(windowId: string) {
  focusedWindowKey = windowId
}
function windowBlurred(windowId: string) {
  if (focusedWindowKey === windowId) {
    focusedWindowKey = null
  }
}

const invalidationHandlers = new Set<(queryKey: any) => void>()

ipcMain.on('invalidate_queries', (_event, info) => {
  invalidationHandlers.forEach((handler) => handler(info))
})

ipcMain.on('open_quick_switcher', (_event, info) => {
  if (getFocusedWindow) {
    getFocusedWindow()?.webContents.send('open_quick_switcher')
  }
})

ipcMain.on('minimize_window', (_event, _info) => {
  if (getFocusedWindow) {
    getFocusedWindow()?.minimize()
  }
})

ipcMain.on('maximize_window', (_event, _info) => {
  const window = getFocusedWindow()
  if (window?.isMaximized()) {
    window.unmaximize()
  } else {
    window?.maximize()
  }
})

ipcMain.on('close_window', (_event, _info) => {
  getFocusedWindow()?.close()
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

const store = new Store({
  name: 'AppStore',
})

type AppWindow = {
  route: NavRoute
  bounds: any
}

const userData = app.getPath('userData')
log('App UserData: ', userData)

let windowsState =
  (store.get('WindowState') as Record<string, AppWindow>) ||
  ({} as Record<string, AppWindow>)

export function openInitialWindows() {
  if (!Object.keys(windowsState).length) {
    trpc.createAppWindow({route: {key: 'home'}})
    return
  }
  try {
    Object.entries(windowsState).forEach(([windowId, window]) => {
      trpc.createAppWindow({
        route: window.route,
        bounds: window.bounds,
        id: windowId,
      })
    })
  } catch (error) {
    error(`[MAIN]: openInitialWindows Error: ${JSON.stringify(error)}`)
    trpc.createAppWindow({route: {key: 'home'}})
    return
  }
}

let isExpectingQuit = false
app.addListener('before-quit', () => {
  isExpectingQuit = true
})

function setWindowsState(newWindows: Record<string, AppWindow>) {
  windowsState = newWindows
  store.set('WindowState', newWindows)
}

function deleteWindowState(windowId: string) {
  const newWindows = {...windowsState}
  delete newWindows[windowId]
  setWindowsState(newWindows)
}
function setWindowState(windowId: string, window: AppWindow) {
  const newWindows = {...windowsState}
  newWindows[windowId] = window
  setWindowsState(newWindows)
}
function updateWindowState(
  windowId: string,
  updater: (window: AppWindow) => AppWindow,
) {
  const newWindows = {...windowsState}
  newWindows[windowId] = updater(newWindows[windowId])
  setWindowsState(newWindows)
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
          const focusedWindow = getFocusedWindow()
          if (!focusedWindow) {
            error(
              'No focused window to open quick switcher',
              focusedWindowKey,
              windowIdCount,
            )
          } else {
            focusedWindow.webContents.send('open_quick_switcher')
          }
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
mainMenu.append(
  new MenuItem({
    role: 'fileMenu',
    submenu: [
      // {
      //   label: 'New Document',
      //   accelerator: 'CmdOrCtrl+n',
      //   click: () => {
      //     // todo
      //   },
      // },
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl+Shift+n',
        click: () => {
          trpc.createAppWindow({route: {key: 'home'}})
        },
      },
      {type: 'separator'},
      {role: 'close'},
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
          openRoute({key: 'home'})
        },
      },
      {
        id: 'route_pubs',
        label: 'Publications',
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          openRoute({key: 'home'})
        },
      },
      {
        id: 'route_pubs',
        label: 'All Publications',
        accelerator: 'CmdOrCtrl+2',
        click: () => {
          openRoute({key: 'all-publications'})
        },
      },
      {
        id: 'groups',
        label: 'Groups',
        accelerator: 'CmdOrCtrl+3',
        click: () => {
          openRoute({key: 'groups'})
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
        role: 'minimize',
      },
    ],
  }),
)

function openRoute(route: NavRoute) {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('open_route', route)
  } else {
    trpc.createAppWindow({route})
  }
}

export const router = t.router({
  createAppWindow: t.procedure
    .input(
      z.object({
        route: z.any(),
        id: z.string().optional(),
        bounds: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
      }),
    )
    .mutation(async ({input}) => {
      const windowId = input.id || `window.${windowIdCount++}.${Date.now()}`
      const bounds = input.bounds
        ? input.bounds
        : {
            width: 1200,
            height: 800,
          }
      const browserWindow = new BrowserWindow({
        show: false,
        frame: false,
        autoHideMenuBar: true,
        // width: 1200,
        // height: 800,
        ...bounds,
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

      log('[MAIN:API]: window created')

      const windowLogger = childLogger(windowId)
      browserWindow.webContents.on(
        'console-message',
        (e, level, message, line, sourceId) => {
          if (level === 0) windowLogger.verbose(message)
          else if (level === 1) windowLogger.info(message)
          else if (level === 2) windowLogger.warn(message)
          else windowLogger.error(message)
        },
      )
      function saveWindowPosition() {
        const bounds = browserWindow.getBounds()
        updateWindowState(windowId, (window) => ({...window, bounds}))
      }
      let windowPositionSaveTimeout: null | NodeJS.Timeout = null
      function saveWindowPositionDebounced() {
        if (windowPositionSaveTimeout) {
          clearTimeout(windowPositionSaveTimeout)
        }
        windowPositionSaveTimeout = setTimeout(() => {
          saveWindowPosition()
        }, 200)
      }
      browserWindow.on('resize', (e, a) => {
        saveWindowPositionDebounced()
      })
      browserWindow.on('moved', (e, a) => {
        saveWindowPositionDebounced()
      })
      browserWindow.on('show', (e) => {
        saveWindowPosition()
      })
      allWindows.set(windowId, browserWindow)
      trpcHandlers.attachWindow(browserWindow)

      const initRoute = input?.route || {key: 'home'}
      setWindowState(windowId, {route: initRoute, bounds: null})

      browserWindow.webContents.send('initWindow', {
        route: initRoute,

        daemonState: goDaemonState,
        windowId,
      })
      browserWindow.webContents.ipc.addListener(
        'windowRoute',
        (info, route) => {
          updateWindowState(windowId, (window) => ({...window, route}))
        },
      )

      browserWindow.webContents.on('did-finish-load', () => {
        const route = windowsState[windowId].route
        browserWindow.webContents.send('initWindow', {
          route,
          daemonState: goDaemonState,
          windowId,
        })
      })

      // First render trick: https://getlotus.app/21-making-electron-apps-feel-native-on-mac
      browserWindow.on('ready-to-show', () => {
        browserWindow.show()
      })

      browserWindow.on('close', () => {
        if (!isExpectingQuit) {
          deleteWindowState(windowId)
        }
        trpcHandlers.detachWindow(browserWindow)
        allWindows.delete(windowId)
      })
      browserWindow.on('show', () => {
        windowFocused(windowId)
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

export type AppInfo = {
  platform: () => typeof process.platform
  arch: () => typeof process.arch
}
