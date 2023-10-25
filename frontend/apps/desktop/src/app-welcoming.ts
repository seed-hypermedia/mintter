import {appStore} from './app-store'
import z from 'zod'
import {t} from './app-trpc'

export const welcomingApi = t.router({
  hasPublished: t.procedure.query(async () => {
    return appStore.get('hasPublished')
  }),
  // markDocPublish returns true if we think this is the user's first publish.
  markDocPublish: t.procedure.input(z.string()).mutation(async ({input}) => {
    if (appStore.get('hasPublished')) {
      return false
    }
    appStore.set('hasPublished', true)
    if (appStore.get('isProbablyNewAccount')) {
      return true
    }
    return false
  }),
  isProbablyNewAccount: t.procedure.query(async () => {
    return appStore.get('isProbablyNewAccount') || false
  }),
  writeIsProbablyNewAccount: t.procedure
    .input(z.boolean())
    .mutation(async ({input}) => {
      appStore.set('isProbablyNewAccount', input)
      return true
    }),
})
