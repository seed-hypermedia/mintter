import {safeStorage} from 'electron'
import {z} from 'zod'
import {secureStore} from './app-store'
import {t} from './app-trpc'

export const secureStorageApi = t.router({
  write: t.procedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      }),
    )
    .mutation(async ({input}) => {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available')
      }
      const encrypted = safeStorage.encryptString(JSON.stringify(input.value))
      secureStore.set(input.key, encrypted)
      return true
    }),
  read: t.procedure.input(z.string()).query(async ({input}) => {
    const encrypted = secureStore.get(input)
    if (!encrypted) return null
    const plainText = safeStorage.decryptString(Buffer.from(encrypted))
    return JSON.parse(plainText)
  }),
})
