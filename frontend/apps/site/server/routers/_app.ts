import {createPromiseClient} from '@bufbuild/connect'
import {Accounts, Publications, WebPublishing} from '@mintter/shared'
import {transport} from 'client'
import {getSiteInfo} from 'get-site-info'
import {hdAccount, hdPublication, hdSiteInfo} from 'server/to-json-hd'
import {z} from 'zod'
import {procedure, router} from '../trpc'

const publicationsClient = createPromiseClient(Publications, transport)
const webClient = createPromiseClient(WebPublishing, transport)
const accountsClient = createPromiseClient(Accounts, transport)

const publicationRouter = router({
  getPathInfo: procedure
    .input(
      z.object({
        documentId: z.string(),
        versionId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const records = await webClient.listWebPublicationRecords({
        documentId: input.documentId,
        version: input.versionId,
      })
      return {
        webPublications: records.publications,
      }
    }),
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
        publication: hdPublication(pub),
      }
    }),
})

const accountRouter = router({
  get: procedure
    .input(
      z.object({
        accountId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const account = await accountsClient.getAccount({
        id: input.accountId,
      })
      return {
        account: hdAccount(account),
      }
    }),
})

const siteInfoRouter = router({
  get: procedure.query(async () => {
    const siteInfo = await getSiteInfo()
    return hdSiteInfo(siteInfo)
  }),
})

export const appRouter = router({
  publication: publicationRouter,
  account: accountRouter,
  siteInfo: siteInfoRouter,
})

export type AppRouter = typeof appRouter
