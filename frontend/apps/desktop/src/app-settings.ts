import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

const AutoUpdateTypes = z.literal('true').or(z.literal('false'))

export type AutoUpdateValues = z.infer<typeof AutoUpdateTypes>

export const APP_AUTO_UPDATE_PREFERENCE = 'AutoUpdatePreference'

var autoUpdatePreference: AutoUpdateValues =
  (appStore.get(APP_AUTO_UPDATE_PREFERENCE) as AutoUpdateValues) || 'true'

export const appSettingsApi = t.router({
  getAutoUpdatePreference: t.procedure.query(async () => {
    return autoUpdatePreference
  }),
  setAutoUpdatePreference: t.procedure
    .input(AutoUpdateTypes)
    .mutation(async ({input}) => {
      return writeAutoUpdateValue(input)
    }),
})

function writeAutoUpdateValue(val: AutoUpdateValues) {
  autoUpdatePreference = val
  appStore.set(APP_AUTO_UPDATE_PREFERENCE, val)
}
