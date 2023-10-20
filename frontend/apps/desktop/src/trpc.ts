import {createTRPCProxyClient} from '@trpc/client'
import {ipcLink} from 'electron-trpc/renderer'
import superjson from 'superjson'
import type {AppRouter} from './app-api'
import {createTRPCReact} from '@trpc/react-query'

export const client = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
  transformer: superjson,
})

export const trpc = createTRPCReact<AppRouter>()
