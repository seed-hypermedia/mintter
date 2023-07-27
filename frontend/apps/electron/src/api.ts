import z from 'zod'
import {initTRPC} from '@trpc/server'
// import {observable} from '@trpc/server/observable'
// import {EventEmitter} from 'events'
import superjson from 'superjson'
import {BrowserWindow} from 'electron'
import {createIPCHandler} from 'electron-trpc/main'
import path from 'path'

// const ee = new EventEmitter()

const t = initTRPC.create({isServer: true, transformer: superjson})

export const router = t.router({
  createAppWindow: t.procedure
    .input(z.object({}).optional())
    .mutation(async ({input}) => {
      const mainWindow = new BrowserWindow({
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

      // mainWindow.on('', () => {})
      // mainWindow.on('closed', () => {})

      createIPCHandler({router, windows: [mainWindow]})

      // and load the index.html of the app.
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        console.log('== LOAD APP', mainWindow)
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
      } else {
        mainWindow.loadFile(
          path.join(
            __dirname,
            `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
          ),
        )
      }

      if (!import.meta.env.PROD) mainWindow.webContents.openDevTools()
    }),

  // greeting: t.procedure.input(z.object({name: z.string() }).query((req) => {
  //   const {input} = req

  //   ee.emit('greeting', `Greeted ${input.name}`)
  //   return {
  //     text: `Hello ${input.name}` as const,
  //   }
  // }),

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

export type AppRouter = typeof router
