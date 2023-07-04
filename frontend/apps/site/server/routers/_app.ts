import {createPromiseClient} from '@bufbuild/connect'
import {Accounts, Changes, Publications, WebPublishing} from '@mintter/shared'
import {transport} from 'client'
import {getSiteInfo} from 'get-site-info'
import {HDChangeInfo} from 'server/json-hd'
import {
  hdAccount,
  hdChangeInfos,
  hdPublication,
  hdSiteInfo,
} from 'server/to-json-hd'
import {z} from 'zod'
import {procedure, router} from '../trpc'

const publicationsClient = createPromiseClient(Publications, transport)
const webClient = createPromiseClient(WebPublishing, transport)
const accountsClient = createPromiseClient(Accounts, transport)
const changesClient = createPromiseClient(Changes, transport)

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
        documentId: z.string().optional(),
        versionId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.documentId) {
        return {publication: null}
      }
      const pub = await publicationsClient.getPublication({
        documentId: input.documentId,
        version: input.versionId,
      })
      return {
        publication: hdPublication(pub),
      }
    }),
  getEmbedMeta: procedure
    .input(
      z.object({
        documentId: z.string().optional(),
        versionId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.documentId) {
        return {publication: null}
      }
      const pub = await publicationsClient.getPublication({
        documentId: input.documentId,
        version: input.versionId,
      })
      return {
        embeds: [],
        // publication: hdPublication(pub),
      }
    }),
  getChanges: procedure
    .input(
      z.object({
        documentId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const {documentId} = input
      const {changes} = await changesClient.listChanges({documentId})
      return {
        changes: hdChangeInfos(changes),
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
