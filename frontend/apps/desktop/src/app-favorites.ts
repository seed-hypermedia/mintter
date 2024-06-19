import {createHmId, unpackHmId} from '@shm/shared'
import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

// legacy pins storage
const PINS_STORAGE_KEY = 'Pins-v003'
type PinsState = {
  accounts: string[]
  documents: {
    docId: string
    authors: string[]
  }[]
}

const FAVORITES_STORAGE_KEY = 'Favorites-v001'

type FavoritesState = {
  favorites: {
    url: string
  }[]
}

function getDefaultOrLegacyFavorites() {
  // handle migration from legacy pins
  const pins = appStore.get(PINS_STORAGE_KEY) as PinsState
  if (!pins) {
    return {
      favorites: [],
    }
  }
  const favorites: {url: string}[] = []
  pins.documents.forEach((doc) => {
    const id = unpackHmId(doc.docId)
    if (!id) return
    favorites.push({
      url: createHmId('d', id.eid, {
        variants: doc.authors.map((author) => ({key: 'author', author})),
      }),
    })
  })
  pins.accounts.forEach((accountId) => {
    favorites.push({url: createHmId('a', accountId)})
  })
  // console.log('Migrating favorites', favorites)
  appStore.set(FAVORITES_STORAGE_KEY, {favorites}) // this completes the migration
  return {favorites}
}

let state: FavoritesState =
  (appStore.get(FAVORITES_STORAGE_KEY) as FavoritesState) ||
  getDefaultOrLegacyFavorites()

async function writeFavorites(newState: FavoritesState) {
  state = newState
  appStore.set(FAVORITES_STORAGE_KEY, newState)
  return undefined
}

export const favoritesApi = t.router({
  get: t.procedure.query(async () => {
    return state
  }),
  setFavorite: t.procedure
    .input(z.object({url: z.string(), isFavorite: z.boolean()}))
    .mutation(async ({input}) => {
      const newFavorites = state.favorites.filter(
        (favorite) => favorite.url !== input.url,
      )
      if (input.isFavorite) {
        newFavorites.push({url: input.url})
      }
      await writeFavorites({
        ...state,
        favorites: newFavorites,
      })
    }),
  addFavorite: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writeFavorites({
      ...state,
      favorites: [
        ...state.favorites.filter((favorite) => favorite.url !== input),
        {
          url: input,
        },
      ],
    })
    return undefined
  }),
  removeFavorite: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writeFavorites({
      ...state,
      favorites: state.favorites.filter((favorite) => favorite.url !== input),
    })
    return undefined
  }),
})
