import {createPromiseClient} from '@bufbuild/connect'
import {Publications} from '@mintter/shared'
import {transport} from 'client'
import {z} from 'zod'
import {procedure, router} from '../trpc'

const publicationsClient = createPromiseClient(Publications, transport)

const publicationRouter = router({
  get: procedure
    .input(
      z.object({
        documentId: z.string(),
        versionId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const pub = await publicationsClient.getPublication({
        documentId: input.documentId,
        version: input.versionId,
      })
      return {
        publication: pub.toJson(),
      }
    }),
})

export const appRouter = router({
  publication: publicationRouter,

  hello: procedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(({input}) => {
      return {
        greeting: `hello ${input.text}`,
      }
    }),
})

// export type definition of API
export type AppRouter = typeof appRouter
