import type {NavRoute} from '@mintter/app/utils/navigation'
import {resolveHmIdToAppRoute} from '@mintter/app/utils/navigation'
import type {AppWindowEvent} from '@mintter/app/utils/window-events'
import {BACKEND_HTTP_PORT} from '@mintter/shared'
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
import {decompressFromEncodedURIComponent} from 'lz-string'
import z from 'zod'
import {commentsApi} from './app-comments'
import {diagnosisApi} from './app-diagnosis'
import {experimentsApi} from './app-experiments'
import {grpcClient} from './app-grpc'
import {pinsApi} from './app-pins'
import {t} from './app-trpc'
import {uploadFile, webImportingApi} from './app-web-importing'
import {welcomingApi} from './app-welcoming'
import {
  closeAppWindow,
  createAppWindow,
  ensureFocusedWindowVisible,
  getAllWindows,
  getFocusedWindow,
  getWindowsState,
} from './app-windows'
import {info, loggingDir} from './logger'

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
info('App UserData: ', userData)

export function openInitialWindows() {
  const windowsState = getWindowsState()
  if (!Object.keys(windowsState).length) {
    trpc.createAppWindow({routes: [{key: 'documents'}]})
    return
  }
  try {
    Object.entries(windowsState).forEach(([windowId, window]) => {
      trpc.createAppWindow({
        routes: window.routes,
        routeIndex: window.routeIndex,
        sidebarLocked: window.sidebarLocked,
        bounds: window.bounds,
        id: windowId,
      })
    })
  } catch (error) {
    info(`[MAIN]: openInitialWindows Error: ${JSON.stringify(error)}`)
    trpc.createAppWindow({routes: [{key: 'documents'}]})
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

export const router = t.router({
  experiments: experimentsApi,
  diagnosis: diagnosisApi,
  welcoming: welcomingApi,
  webImporting: webImportingApi,
  pins: pinsApi,
  comments: commentsApi,
  closeAppWindow: t.procedure.input(z.string()).mutation(async ({input}) => {
    closeAppWindow(input)
    return null
  }),
  createAppWindow: t.procedure
    .input(
      z.object({
        routes: z.array(z.any()), // todo, zodify NavRoute type
        routeIndex: z.number().default(0),
        id: z.string().optional(),
        sidebarLocked: z.boolean().default(false),
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
      const htmlValue = await webView.webContents.executeJavaScript(
        "document.getElementsByTagName('html').item(0).outerHTML",
      )
      const versionRegex =
        /<meta\s+name="hypermedia-entity-version"\s+content="(.*?)"/
      const versionMatch = htmlValue.match(versionRegex)
      const hmVersion = versionMatch ? versionMatch[1] : null

      const hmIdRegex = /<meta\s+name="hypermedia-entity-id"\s+content="(.*?)"/
      const hmIdMatch = htmlValue.match(hmIdRegex)
      const hmId = hmIdMatch ? hmIdMatch[1] : null

      const hmUrlRegex = /<meta\s+name="hypermedia-url"\s+content="(.*?)"/
      const hmUrlMatch = htmlValue.match(hmUrlRegex)
      const hmUrl = hmUrlMatch ? hmUrlMatch[1] : null

      if (hmId && hmVersion) {
        return {hypermedia: {id: hmId, version: hmVersion, url: hmUrl}}
      }

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
    return {dataDir: userData, loggingDir, grpcHost: process.env.GRPC_HOST}
  }),
})

export const trpc = router.createCaller({})

const trpcHandlers = createIPCHandler({router, windows: []})

export type AppRouter = typeof router

export async function handleUrlOpen(url: string) {
  info('[Deep Link Open]: ', url)
  const hmId = await resolveHmIdToAppRoute(url, grpcClient)
  if (!hmId?.navRoute) {
    const connectionRegexp = /connect-peer\/([\w\d]+)/
    const parsedConnectUrl = url.match(connectionRegexp)
    const connectionDeviceId = parsedConnectUrl ? parsedConnectUrl[1] : null
    if (connectionDeviceId) {
      ensureFocusedWindowVisible()
      dispatchFocusedWindowAppEvent({
        key: 'connectPeer',
        connectionString: connectionDeviceId,
      })
      return
    }

    if (!hmId?.navRoute) {
      const connectionRegexp = /connect\/([\w\-\+]+)/
      const parsedConnectUrl = url.match(connectionRegexp)
      const connectInfoEncoded = parsedConnectUrl ? parsedConnectUrl[1] : null
      if (connectInfoEncoded) {
        ensureFocusedWindowVisible()
        const connectInfoJSON =
          decompressFromEncodedURIComponent(connectInfoEncoded)
        const connectInfo = JSON.parse(connectInfoJSON)
        dispatchFocusedWindowAppEvent({
          key: 'connectPeer',
          connectionString: connectInfo.a
            .map((shortAddr: string) => `${shortAddr}/p2p/${connectInfo.d}`)
            .join(','),
          name: connectInfo.n,
        })
        return
      }
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
  info('handling second instance', args, cwd)
  // from https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app
  // const focusedWindow = getFocusedWindow()
  // if (focusedWindow) {
  //   if (focusedWindow.isMinimized()) focusedWindow.restore()
  //   focusedWindow.focus()
  // }
  const linkUrl = args.pop()
  linkUrl && handleUrlOpen(linkUrl)
}
