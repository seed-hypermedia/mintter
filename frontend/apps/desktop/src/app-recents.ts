import {NavRoute, getRecentsRouteEntityUrl} from '@mintter/app/utils/routes'
import {PublicationVariant, getPublicationVariant} from '@mintter/shared'
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
  variants?: PublicationVariant[]
}

type RecentsState = {
  recents: RecentEntry[]
  docVariants: Record<string, PublicationVariant[]>
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
  const prevDocVariants = recentsState.docVariants
  recentsState = newState
  appStore.set(RECENTS_STORAGE_KEY, recentsState)
  if (prevRecents !== recentsState.recents) {
    invalidateQueries(['trpc.recents.getRecents'])
  }
  if (prevDocVariants !== recentsState.docVariants) {
    invalidateQueries(['trpc.recents.getDocVariants'])
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
  } else if (route.key === 'group') {
    const group = await grpcClient.groups.getGroup({
      id: route.groupId,
    })
    title = group.title || route.groupId
    subtitle = 'Group'
  } else if (route.key === 'publication') {
    const {publication} = await getPublicationVariant(
      grpcClient,
      route.documentId,
      route.variants,
      route.versionId,
    )
    if (publication?.document?.title) {
      title = publication.document.title
    }
    subtitle = 'Publication'
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
  const variants = route.key === 'publication' ? route.variants : undefined
  const titles = await getRouteTitles(route)
  updateRecents((state: RecentsState): RecentsState => {
    let docVariants = state.docVariants
    if (route.key === 'publication' && route.documentId && route.variants) {
      docVariants = {
        ...docVariants,
        [route.documentId]: route.variants,
      }
    }
    let recents = state.recents
    if (url) {
      recents = [
        {
          type,
          url,
          time,
          variants,
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
      docVariants,
    }
  })
}

export const recentsApi = t.router({
  getRecents: t.procedure.query(async () => {
    return recentsState.recents
  }),
  getDocVariants: t.procedure.query(async () => {
    return recentsState.docVariants
  }),
})
