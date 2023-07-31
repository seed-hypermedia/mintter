import z from 'zod'
import {initTRPC} from '@trpc/server'
import {observable} from '@trpc/server/observable'
// import {EventEmitter} from 'events'
import superjson from 'superjson'
import {BrowserWindow, ipcMain} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'

const t = initTRPC.create({isServer: true, transformer: superjson})

let windowIdCount = 1

const allWindows = new Map<string, BrowserWindow>()

const invalidationHandlers = new Set<(queryKey: any) => void>()

ipcMain.on('invalidate_queries', (_event, info) => {
  invalidationHandlers.forEach((handler) => handler(info))
})

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
      allWindows[windowId] = browserWindow
      trpcHandlers.attachWindow(browserWindow)

      browserWindow.webContents.send('initWindow', {
        route: input?.route,
        windowId,
      })

      // First render trick: https://getlotus.app/21-making-electron-apps-feel-native-on-mac
      browserWindow.on('ready-to-show', () => {
        browserWindow.show()
      })

      browserWindow.on('close', () => {
        trpcHandlers.detachWindow(browserWindow)
        delete allWindows[windowId]
      })

      // and load the index.html of the app.
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        console.log(
          '== LOAD APP',
          browserWindow,
          MAIN_WINDOW_VITE_DEV_SERVER_URL,
        )
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

const trpcHandlers = createIPCHandler({router, windows: []})

export type AppRouter = typeof router
