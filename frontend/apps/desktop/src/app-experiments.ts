import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

const EXPERIMENTS_STORAGE_KEY = 'Experiments-v001'

const experimentsZ = z.object({
  webImporting: z.boolean().optional(),
  nostr: z.boolean().optional(),
  developerTools: z.boolean().optional(),
  pubContentDevMenu: z.boolean().optional(),
})
type Experiments = z.infer<typeof experimentsZ>
let experimentsState: Experiments = appStore.get(EXPERIMENTS_STORAGE_KEY) || {}

export const experimentsApi = t.router({
  get: t.procedure.query(async () => {
    return experimentsState
  }),
  write: t.procedure.input(experimentsZ).mutation(async ({input}) => {
    const prevExperimentsState = await appStore.get(EXPERIMENTS_STORAGE_KEY)
    const newExperimentsState = {...(prevExperimentsState || {}), ...input}
    experimentsState = newExperimentsState
    appStore.set(EXPERIMENTS_STORAGE_KEY, newExperimentsState)
    return undefined
  }),
})
