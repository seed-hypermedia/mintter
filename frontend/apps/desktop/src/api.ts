import type {
  AppWindowEvent,
  NavRoute,
  NavState,
} from '@mintter/app/src/utils/navigation'
import {unpackHmIdWithAppRoute} from '@mintter/app/src/utils/navigation'
import {initTRPC} from '@trpc/server'
import {observable} from '@trpc/server/observable'
import {BrowserWindow, Menu, MenuItem, app, dialog, ipcMain} from 'electron'
import Store from 'electron-store'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'
import superjson from 'superjson'
import z from 'zod'
import {APP_USER_DATA_PATH} from './app-paths'
import {childLogger, error, log, warn} from './logger'

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

function ensureFocusedWindowVisible() {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    if (focusedWindow.isMinimized()) focusedWindow.restore()
    focusedWindow.focus()
  } else {
    console.error(
      'did not have the focused window. we should create a window or refocus another window from allWindows',
    )
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
  cwd: APP_USER_DATA_PATH,
})

type AppWindow = {
  routes: NavRoute[]
  routeIndex: number
  bounds: any
}

const userData = app.getPath('userData')
log('App UserData: ', userData)

let windowsState =
  (store.get('WindowState-v002') as Record<string, AppWindow>) ||
  ({} as Record<string, AppWindow>)

function getAWindow() {
  const focused = getFocusedWindow()
  if (focused) return focused
  const allWins = Object.values(allWindows)
  const window: BrowserWindow | undefined = allWins[allWins.length - 1]
  return window
}

export function openInitialWindows() {
  if (!Object.keys(windowsState).length) {
    trpc.createAppWindow({routes: [{key: 'home'}]})
    return
  }
  try {
    Object.entries(windowsState).forEach(([windowId, window]) => {
      trpc.createAppWindow({
        routes: window.routes,
        routeIndex: window.routeIndex,
        bounds: window.bounds,
        id: windowId,
      })
    })
  } catch (error) {
    error(`[MAIN]: openInitialWindows Error: ${JSON.stringify(error)}`)
    trpc.createAppWindow({routes: [{key: 'home'}]})
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
  const winState = newWindows[windowId]
  if (winState) {
    newWindows[windowId] = updater(winState)
    setWindowsState(newWindows)
  } else warn('updateWindowState: window not found: ' + windowId)
}

function dispatchFocusedWindowAppEvent(event: AppWindowEvent) {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('appWindowEvent', event)
  }
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
          trpc.createAppWindow({routes: [{key: 'settings'}]})
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
      {
        label: 'New Document',
        accelerator: 'CmdOrCtrl+n',
        click: () => {
          trpc.createAppWindow({routes: [{key: 'draft'}]})
        },
      },
      {
        label: 'New Window',
        accelerator: 'CmdOrCtrl+Shift+n',
        click: () => {
          trpc.createAppWindow({routes: [{key: 'home'}]})
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
        id: 'back',
        label: 'Back',
        accelerator: 'CmdOrCtrl+Left',
        click: () => {
          dispatchFocusedWindowAppEvent('back')
        },
      },
      {
        id: 'forward',
        label: 'Forward',
        accelerator: 'CmdOrCtrl+Right',
        click: () => {
          dispatchFocusedWindowAppEvent('forward')
        },
      },
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
          openRoute({key: 'drafts'})
        },
      },
      {
        id: 'route_contacts',
        label: 'Contacts',
        accelerator: 'CmdOrCtrl+9',
        click: () => {
          openRoute({
            key: 'contacts',
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
    trpc.createAppWindow({routes: [route], routeIndex: 0})
  }
}

export const router = t.router({
  createAppWindow: t.procedure
    .input(
      z.object({
        routes: z.array(z.any()), // todo, zodify NavRoute type
        routeIndex: z.number().default(0),
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
      const win = getAWindow()
      const prevWindowBounds = win?.getBounds()
      const bounds = input.bounds
        ? input.bounds
        : prevWindowBounds
        ? {
            ...prevWindowBounds,
            x: prevWindowBounds.x + 60,
            y: prevWindowBounds.y + 60,
          }
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

      const initRoutes = input?.routes || [{key: 'home'}]
      setWindowState(windowId, {
        routes: initRoutes,
        routeIndex: input.routeIndex,
        bounds: null,
      })

      browserWindow.webContents.send('initWindow', {
        routes: initRoutes,
        routeIndex: input.routeIndex,
        daemonState: goDaemonState,
        windowId,
      })
      browserWindow.webContents.ipc.addListener(
        'windowNavState',
        (info, {routes, routeIndex}: NavState) => {
          updateWindowState(windowId, (window) => ({
            ...window,
            routes,
            routeIndex,
          }))
        },
      )

      browserWindow.webContents.on('did-finish-load', () => {
        const routes = windowsState[windowId]?.routes
        const routeIndex = windowsState[windowId]?.routeIndex
        browserWindow.webContents.send('initWindow', {
          routes,
          routeIndex,
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

export function handleUrlOpen(url: string) {
  log('[Deep Link Open]: ', url)
  const hmId = unpackHmIdWithAppRoute(url)
  if (!hmId?.navRoute) {
    const connectionRegexp = /connect-peer\/([\w\d]+)/
    const parsedConnectUrl = url.match(connectionRegexp)
    const connectionDeviceId = parsedConnectUrl ? parsedConnectUrl[1] : null
    if (connectionDeviceId) {
      ensureFocusedWindowVisible()
      dispatchFocusedWindowAppEvent({
        key: 'connectPeer',
        peer: connectionDeviceId,
      })
      return
    }

    dialog.showErrorBox('Invalid URL', `We could not parse this URL: ${url}`)
    return
  }
  trpc.createAppWindow({
    routes: [hmId.navRoute],
  })
}

export function handleSecondInstance(
  _event: {defaultPrevented: boolean; preventDefault: () => void},
  args: string[],
  cwd: string,
) {
  log('handling second instance', args, cwd)
  // from https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app
  // const focusedWindow = getFocusedWindow()
  // if (focusedWindow) {
  //   if (focusedWindow.isMinimized()) focusedWindow.restore()
  //   focusedWindow.focus()
  // }
  const linkUrl = args.pop()
  linkUrl && handleUrlOpen(linkUrl)
}
