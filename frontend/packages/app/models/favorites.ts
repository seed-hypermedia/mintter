import {trpc} from '@mintter/desktop/src/trpc'
import {
  HMAccount,
  HMGroup,
  UnpackedHypermediaId,
  unpackHmId,
} from '@mintter/shared'
import {useMemo} from 'react'
import {useQueryInvalidator} from '../app-context'
import {useAccounts} from './accounts'
import {useGroups} from './groups'

export type FavoriteItem =
  | {
      key: 'group'
      id: UnpackedHypermediaId
      url: string
      groupId: string
      version?: string | null
      group: HMGroup
    }
  | {
      key: 'document'
      id: UnpackedHypermediaId
      url: string
    }
  | {
      key: 'account'
      id: UnpackedHypermediaId
      url: string
      accountId: string
      account: HMAccount
    }

export function useFavorites() {
  const favoritesQuery = trpc.favorites.get.useQuery()
  const {groups, accounts, favorites, favoriteUrls} = useMemo(() => {
    const favoriteUrls: string[] = []
    const unpackedIds = favoritesQuery.data?.favorites.map((favorite) => {
      favoriteUrls.push(favorite.url)
      return unpackHmId(favorite.url)
    })
    const groups: {id: string; version?: string | null}[] = []
    const accounts: string[] = []
    unpackedIds?.forEach((id) => {
      if (id?.type === 'g' && id?.groupPathName === null) {
        groups.push({
          id: id.qid,
          version: id.version,
        })
      }
      if (id?.type === 'a') {
        accounts.push(id.eid)
      }
    })
    return {
      favorites: unpackedIds,
      favoriteUrls,
      groups,
      accounts,
    }
  }, [favoritesQuery.data])
  const groupsQuery = useGroups(groups)
  const accountsQuery = useAccounts(accounts)
  const favoriteItems: FavoriteItem[] = []
  favorites?.forEach((id, favoriteIndex) => {
    const url = favoriteUrls[favoriteIndex]
    if (id?.type === 'g' && id?.groupPathName === null && url) {
      const groupQ = groupsQuery.find((group) => group.data?.id === id.qid)
      const group = groupQ?.data
      if (group) {
        favoriteItems.push({
          key: 'group',
          id,
          url,
          groupId: id.qid,
          version: id.version,
          group,
        })
      }
    }
    if (id?.type === 'a' && url) {
      const accountQ = accountsQuery.find(
        (account) => account.data?.id === id.eid,
      )
      const account = accountQ?.data
      if (account) {
        favoriteItems.push({
          key: 'account',
          id,
          url,
          accountId: id.qid,
          account,
        })
      }
    }
    if (id?.type === 'd' && url) {
      favoriteItems.push({
        key: 'document',
        id,
        url,
      })
    }
  })

  return favoriteItems
}

export function useFavorite(url?: string | null) {
  const favorites = useFavorites()
  const invalidate = useQueryInvalidator()
  const setFavorite = trpc.favorites.setFavorite.useMutation({
    onSuccess: () => {
      invalidate(['trpc.favorites.get'])
    },
  })
  if (!url)
    return {isFavorited: false, removeFavorite: () => {}, addFavorite: () => {}}
  const isFavorited = favorites.some((favorite) => favorite.url === url)
  return {
    isFavorited,
    removeFavorite: () => {
      setFavorite.mutate({url, isFavorite: false})
    },
    addFavorite: () => {
      setFavorite.mutate({url, isFavorite: true})
    },
  }
}
