import z from 'zod'
import {initTRPC} from '@trpc/server'
// import {observable} from '@trpc/server/observable'
// import {EventEmitter} from 'events'
import superjson from 'superjson'
import {BrowserWindow} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'

const t = initTRPC.create({isServer: true, transformer: superjson})

let windowIdCount = 1

const allWindows = new Map<string, BrowserWindow>()

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
        width: 800,
        height: 600,
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
      browserWindow.on('show', () => {
        browserWindow.webContents.send('initWindow', {
          route: input?.route,
          windowId,
        })
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

  // subscription: t.procedure.subscription(() => {
  //   return observable((emit) => {
  //     function onGreet(text: string) {
  //       emit.next({text})
  //     }

  //     ee.on('greeting', onGreet)

  //     return () => {
  //       ee.off('greeting', onGreet)
  //     }
  //   })
  // }),
})

const trpcHandlers = createIPCHandler({router, windows: []})

export type AppRouter = typeof router
