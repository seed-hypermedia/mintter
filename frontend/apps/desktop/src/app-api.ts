import type {NavRoute, NavState} from '@mintter/app/utils/navigation'
import {unpackHmIdWithAppRoute} from '@mintter/app/utils/navigation'
import type {AppWindowEvent} from '@mintter/app/utils/window-events'
import {BACKEND_FILE_UPLOAD_URL, BACKEND_HTTP_PORT} from '@mintter/shared'
import {observable} from '@trpc/server/observable'
import {
  BrowserWindow,
  NativeImage,
  app,
  dialog,
  ipcMain,
  nativeTheme,
} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import {writeFile} from 'fs-extra'
import path from 'path'
import z from 'zod'
import {experimentsApi} from './app-experiments'
import {appStore} from './app-store'
import {t} from './app-trpc'
import {childLogger, log, logFilePath, warn} from './logger'

let windowIdCount = 1

const allWindows = new Map<string, BrowserWindow>()

let focusedWindowKey: string | null = null

function getFocusedWindow(): BrowserWindow | null | undefined {
  // return focusedWindowKey ? allWindows.get(focusedWindowKey) : null
  // return Object.values(allWindows).find(window => window.focused)
  return BrowserWindow.getFocusedWindow()
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

ipcMain.on('focusedWindowAppEvent', (_event, info) => {
  dispatchFocusedWindowAppEvent(info)
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

nativeTheme.addListener('updated', () => {
  allWindows.forEach((window) => {
    window.webContents.send('darkMode', nativeTheme.shouldUseDarkColors)
  })
})

type AppWindow = {
  routes: NavRoute[]
  routeIndex: number
  bounds: any
}

const userData = app.getPath('userData')
log('App UserData: ', userData)

const WINDOW_STATE_STORAGE_KEY = 'WindowState-v002'

let windowsState =
  (appStore.get(WINDOW_STATE_STORAGE_KEY) as Record<string, AppWindow>) ||
  ({} as Record<string, AppWindow>)

function getAWindow() {
  const focused = getFocusedWindow()
  if (focused) return focused
  const allWins = Object.values(allWindows)
  const window: BrowserWindow | undefined = allWins[allWins.length - 1]
  return window
}

const windowNavState: Record<string, {routes: any[]; routeIndex: number}> = {}

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
    log(`[MAIN]: openInitialWindows Error: ${JSON.stringify(error)}`)
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
  appStore.set(WINDOW_STATE_STORAGE_KEY, newWindows)
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

export function dispatchFocusedWindowAppEvent(event: AppWindowEvent) {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('appWindowEvent', event)
  }
}

export function openRoute(route: NavRoute) {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.webContents.send('open_route', route)
  } else {
    trpc.createAppWindow({routes: [route], routeIndex: 0})
  }
}

async function uploadFile(file: Blob | string) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })
  const data = await response.text()
  return data
}

export const router = t.router({
  experiments: experimentsApi,
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
          .or(z.null())
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
        backgroundColor: nativeTheme.shouldUseDarkColors
          ? '#151515'
          : '#f9f9f9',
        frame: false,
        autoHideMenuBar: true,
        // width: 1200,
        // height: 800,
        ...bounds,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
        },
        // @ts-expect-error
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

      const initRoutes = input?.routes || [{key: 'home'}]

      windowNavState[windowId] = {
        routes: initRoutes,
        routeIndex: input.routeIndex,
      }

      browserWindow.webContents.ipc.on('initWindow', (e) => {
        e.returnValue = {
          navState: windowNavState[windowId],
          daemonState: goDaemonState,
          windowId,
          darkMode: nativeTheme.shouldUseDarkColors,
        }
      })

      browserWindow.webContents.ipc.on('windowIsReady', (e) => {
        browserWindow.show()
      })

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
      // @ts-expect-error
      browserWindow.on('resize', (e, a) => {
        saveWindowPositionDebounced()
      })
      // @ts-expect-error
      browserWindow.on('moved', (e, a) => {
        saveWindowPositionDebounced()
      })
      // @ts-expect-error
      browserWindow.on('show', (e) => {
        saveWindowPosition()
      })
      allWindows.set(windowId, browserWindow)
      trpcHandlers.attachWindow(browserWindow)

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
          windowNavState[windowId] = {routes, routeIndex}
          updateWindowState(windowId, (window) => ({
            ...window,
            routes,
            routeIndex,
          }))
        },
      )

      // First render trick: https://getlotus.app/21-making-electron-apps-feel-native-on-mac
      browserWindow.on('ready-to-show', () => {
        // browserWindow.show()
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

      windowFocused(windowId)

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

      // if (!IS_PROD_DESKTOP) browserWindow.webContents.openDevTools()
    }),

  webQuery: t.procedure
    .input(
      z.object({
        webUrl: z.string(),
      }),
    )
    .mutation(async ({input: {webUrl}}) => {
      const webView = new BrowserWindow({
        show: false,
        width: 1200,
        height: 1200,
        webPreferences: {
          offscreen: true,
        },
      })
      await webView.webContents.loadURL(webUrl)
      const png = await new Promise<Buffer>((resolve, reject) => {
        function paintHandler(
          event: unknown,
          dirty: unknown,
          image: NativeImage,
        ) {
          webView.webContents.removeListener('paint', paintHandler)
          resolve(image.toPNG())
        }
        webView.webContents.on('paint', paintHandler)
        setTimeout(() => {
          reject(new Error('paint timeout'))
        }, 500)
      })
      const pdf = await webView.webContents.printToPDF({
        scale: 1,
      })
      const htmlValue = await webView.webContents.executeJavaScript(
        "document.getElementsByTagName('html').item(0).outerHTML",
      )
      await writeFile('/tmp/test.pdf', pdf)
      const uploadedPDF = await uploadFile(new Blob([pdf]))
      const uploadedHTML = await uploadFile(new Blob([htmlValue]))
      await writeFile('/tmp/test.png', png)
      const uploadedPNG = await uploadFile(new Blob([htmlValue]))
      webView.close()
      return {uploadedPNG, uploadedPDF, uploadedHTML, htmlValue}
    }),

  queryInvalidation: t.procedure.subscription(() => {
    return observable((emit) => {
      function handler(value: unknown[]) {
        emit.next(value)
      }
      invalidationHandlers.add(handler)
      return () => {
        invalidationHandlers.delete(handler)
      }
    })
  }),

  getDaemonInfo: t.procedure.query(async () => {
    const buildInfoUrl = `http://localhost:${BACKEND_HTTP_PORT}/debug/buildinfo`
    const daemonVersionReq = await fetch(buildInfoUrl)
    const daemonVersion = await daemonVersionReq.text()
    return daemonVersion
  }),

  getAppInfo: t.procedure.query(() => {
    return {dataDir: userData, logFilePath, grpcHost: process.env.GRPC_HOST}
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
