import type {NavRoute} from '@mintter/app/utils/navigation'
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
import z from 'zod'
import {experimentsApi} from './app-experiments'
import {t} from './app-trpc'
import {
  createAppWindow,
  ensureFocusedWindowVisible,
  getAllWindows,
  getFocusedWindow,
  getWindowsState,
} from './app-windows'
import {log, logFilePath} from './logger'

const invalidationHandlers = new Set<(queryKey: any) => void>()

ipcMain.on('invalidate_queries', (_event, info) => {
  invalidationHandlers.forEach((handler) => handler(info))
})

ipcMain.on('focusedWindowAppEvent', (_event, info) => {
  dispatchFocusedWindowAppEvent(info)
})

ipcMain.on('minimize_window', (_event, _info) => {
  getFocusedWindow()?.minimize()
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

nativeTheme.addListener('updated', () => {
  getAllWindows().forEach((window) => {
    window.webContents.send('darkMode', nativeTheme.shouldUseDarkColors)
  })
})

const userData = app.getPath('userData')
log('App UserData: ', userData)

export function openInitialWindows() {
  const windowsState = getWindowsState()
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
      const browserWindow = createAppWindow(input)
      trpcHandlers.attachWindow(browserWindow)
      browserWindow.on('close', () => {
        trpcHandlers.detachWindow(browserWindow)
      })
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
