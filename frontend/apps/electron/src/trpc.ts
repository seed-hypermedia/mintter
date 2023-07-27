import {createTRPCProxyClient} from '@trpc/client'
import {ipcLink} from 'electron-trpc/renderer'

export const client = createTRPCProxyClient({
  links: [ipcLink()],
})
