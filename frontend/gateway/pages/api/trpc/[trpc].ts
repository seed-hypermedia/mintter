import * as trpcNext from '@trpc/server/adapters/next'
import {appRouter} from '../../../server/routers/_app'

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
})

export const config = {
  runtime: 'nodejs',
  // edge runtime not working. in theory this would help:
  //https://trpc.io/docs/server/adapters/fetch#nextjs-edge-runtime
}
