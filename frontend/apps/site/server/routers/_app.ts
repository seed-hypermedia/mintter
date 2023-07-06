import {createPromiseClient} from '@bufbuild/connect'
import {Accounts, Changes, Publications, WebPublishing} from '@mintter/shared'
import {transport} from 'client'
import {getSiteInfo} from 'get-site-info'
import {HDChangeInfo} from 'server/json-hd'
import {
  hdAccount,
  hdChangeInfo,
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
        version: input.versionId || '',
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
        version: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const pub = await publicationsClient.getPublication({
        documentId: input.documentId,
        version: input.version,
      })
      if (!pub) throw new Error('getPublication returned null')
      const docId = pub.document?.id
      if (!docId) throw new Error('docId not retreived from getPublication')
      const version = pub.version
      if (!version) throw new Error('version not retrieved from getPublication')
      const changesIndex: Map<string, HDChangeInfo> = new Map()
      const changeDeps: Map<string, Set<string>> = new Map()
      const downstreamChanges: Map<string, Set<string>> = new Map()
      // pub.changes = pub.changes || []
      const {documentId} = input
      const {changes} = await changesClient.listChanges({documentId})
      changes.forEach((change) => {
        const hdChange = hdChangeInfo(change)
        hdChange && changesIndex.set(change.id, hdChange)
        if (!changeDeps.has(change.id)) changeDeps.set(change.id, new Set())
        change.deps.forEach((dep) => {
          changeDeps.get(change.id)!.add(dep)
          if (!downstreamChanges.has(dep)) downstreamChanges.set(dep, new Set())
          downstreamChanges.get(dep)!.add(change.id)
        })
      })
      function changeIdsToChanges(ids: string[]) {
        return ids.map((id) => changesIndex.get(id)).filter(Boolean)
      }
      const versionChanges = version.split(',')
      const versionChangesSet = new Set(versionChanges)
      const versionDownstream = downstreamChanges.get(version)
      const deps = new Set<string>()
      const allDeps: string[] = []
      versionChanges.forEach((versionChangeId) => {
        changeDeps.get(versionChangeId)?.forEach((dep) => {
          deps.add(dep)
        })
        downstreamChanges.get(versionChangeId)?.forEach((changeId) => {
          versionDownstream?.add(changeId)
        })
      })

      function lookForDeps(changeId: string) {
        if (allDeps.indexOf(changeId) !== -1) {
          return
        }
        if (changeId !== version) allDeps.push(changeId)
        const downstreamDepx = changeDeps.get(changeId)
        if (downstreamDepx) {
          downstreamDepx.forEach(lookForDeps)
        }
      }

      versionChanges.forEach(lookForDeps)
      return {
        versionChanges: changeIdsToChanges(versionChanges),
        deps: changeIdsToChanges(Array.from(deps)),
        downstreamChanges: changeIdsToChanges(
          Array.from(downstreamChanges.get(version) || []).filter(
            (changeId) => !versionChangesSet.has(changeId),
          ),
        ),
        allDeps: changeIdsToChanges(allDeps),
        pub: hdPublication(pub),
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
