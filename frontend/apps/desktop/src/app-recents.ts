import {NavRoute, getRecentsRouteEntityUrl} from '@/utils/routes'
import {z} from 'zod'
import {grpcClient} from './app-grpc'
import {invalidateQueries} from './app-invalidation'
import {appStore} from './app-store'
import {t} from './app-trpc'

const RECENTS_STORAGE_KEY = 'Recents-v001'

type RecentEntry = {
  type: 'entity' | 'draft'
  url: string
  title: string
  subtitle?: string
  time: number
}

type RecentsState = {
  recents: RecentEntry[]
}

let recentsState: RecentsState = (appStore.get(
  RECENTS_STORAGE_KEY,
) as RecentsState) || {
  recents: [],
}

const MAX_RECENTS = 20

export function updateRecents(updater: (state: RecentsState) => RecentsState) {
  const newState = updater(recentsState)
  const prevRecents = recentsState.recents
  recentsState = newState
  appStore.set(RECENTS_STORAGE_KEY, recentsState)
  if (prevRecents !== recentsState.recents) {
    invalidateQueries(['trpc.recents.getRecents'])
  }
}

async function getRouteTitles(route: NavRoute) {
  let subtitle: undefined | string = undefined
  let title = '?'
  if (route.key === 'account') {
    const account = await grpcClient.accounts.getAccount({
      id: route.accountId,
    })
    title = account.profile?.alias || account.id
    subtitle = 'Account'
  } else if (route.key === 'document') {
    const document = await grpcClient.documents.getDocument({
      documentId: route.documentId,
      version: route.versionId,
    })
    if (document?.metadata?.name) {
      title = document?.metadata.name
    }
    subtitle = 'Document'
  }
  return {
    title,
    subtitle,
  }
}

export async function updateRecentRoute(route: NavRoute) {
  const url = getRecentsRouteEntityUrl(route)
  const type: RecentEntry['type'] = route.key === 'draft' ? 'draft' : 'entity'
  const time = Date.now()
  const titles = await getRouteTitles(route)
  updateRecents((state: RecentsState): RecentsState => {
    let recents = state.recents
    if (url) {
      recents = [
        {
          type,
          url,
          time,
          ...titles,
        },
        ...state.recents
          .filter((item) => {
            return item.url !== url || item.type !== type
          })
          .slice(0, MAX_RECENTS),
      ]
    }
    return {
      recents,
    }
  })
}

export const recentsApi = t.router({
  getRecents: t.procedure.query(async () => {
    return recentsState.recents
  }),
  deleteRecent: t.procedure.input(z.string()).mutation(({input}) => {
    updateRecents((state: RecentsState): RecentsState => {
      const recents = state.recents.filter((item) => item.url !== input)
      return {
        ...state,
        recents,
      }
    })
  }),
})
