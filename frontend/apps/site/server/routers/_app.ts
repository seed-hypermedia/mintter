import {createPromiseClient} from '@bufbuild/connect'
import {
  Accounts,
  Changes,
  ContentGraph,
  Groups,
  HYPERMEDIA_GROUP_PREFIX,
  Publications,
  Role,
  WebPublishing,
  getIdsfromUrl,
} from '@mintter/shared'
import {localWebsiteClient, transport} from 'client'
import {getSiteInfo} from 'get-site-info'
import {HMChangeInfo} from '@mintter/ui'
import {
  hmAccount,
  hmChangeInfo,
  hmGroup,
  hmLink,
  hmPublication,
  hmSiteInfo,
} from 'server/to-json-hm'
import {z} from 'zod'
import {procedure, router} from '../trpc'

const contentGraphClient = createPromiseClient(ContentGraph, transport)
const publicationsClient = createPromiseClient(Publications, transport)
const webClient = createPromiseClient(WebPublishing, transport)
const accountsClient = createPromiseClient(Accounts, transport)
const groupsClient = createPromiseClient(Groups, transport)
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
  getPath: procedure
    .input(
      z.object({
        pathName: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.pathName) return null
      const pathRecord = await localWebsiteClient.getPath({
        path: input.pathName,
      })
      const publication = pathRecord?.publication
      const documentId = publication?.document?.id
      if (!publication || !documentId) return null
      return {
        versionId: publication.version,
        documentId,
        publishTime: publication.document?.publishTime?.toJson() as string,
      }
    }),
  getDocRecord: procedure
    .input(
      z.object({
        documentId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.documentId) return null
      const webPubs = await localWebsiteClient.listWebPublications({})
      const pub = webPubs.publications.find(
        (pub) => pub.documentId === input.documentId,
      )
      if (!pub) return null
      return {
        path: pub.path,
        versionId: pub.version,
        documentId: pub.documentId,
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
        publication: hmPublication(pub),
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
        // publication: hmPublication(pub),
      }
    }),
  getCitations: procedure
    .input(
      z.object({
        documentId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      if (!input.documentId) {
        return {citationLinks: []}
      }
      const citationList = await contentGraphClient.listCitations({
        documentId: input.documentId,
      })
      return {
        citationLinks: citationList.links.map(hmLink),
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
      const changesIndex: Map<string, HMChangeInfo> = new Map()
      const changeDeps: Map<string, Set<string>> = new Map()
      const downstreamChanges: Map<string, Set<string>> = new Map()
      // pub.changes = pub.changes || []
      const {documentId} = input
      const {changes} = await changesClient.listChanges({documentId})
      changes.forEach((change) => {
        const hmChange = hmChangeInfo(change)
        hmChange && changesIndex.set(change.id, hmChange)
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
        pub: hmPublication(pub),
      }
    }),
})

const groupRouter = router({
  getSitePath: procedure
    .input(z.object({hostname: z.string()}))
    .query(async ({input}) => {
      // todo. get current group content and find the pathName, return the corresponding doc
      console.log('getting site info')
      const siteInfo = await groupsClient.getSiteInfo({
        hostname: input.hostname,
      })
      return {
        groupId: siteInfo.groupId,
        ownerId: siteInfo.ownerId,
        version: siteInfo.version,
      }
    }),
  getGroupPath: procedure
    .input(
      z.object({
        groupEid: z.string(),
        pathName: z.string(),
        version: z.string().optional(),
      }),
    )
    .query(async ({input: {pathName, groupEid, version}}) => {
      // todo. get current group content and find the pathName, return the corresponding doc
      console.log('getting site info')
      const groupId = `${HYPERMEDIA_GROUP_PREFIX}${groupEid}`
      const siteInfo = await groupsClient.listContent({
        id: groupId,
        version,
      })
      const group = await groupsClient.getGroup({
        id: groupId,
        version,
      })
      const item = siteInfo.content[pathName]
      if (!item) return null
      const [documentId, documentVersion] = getIdsfromUrl(item)
      if (!documentId || !documentVersion) return null // version is required for group content
      const pub = await publicationsClient.getPublication({
        documentId,
        version: documentVersion,
      })
      return {
        publication: hmPublication(pub),
        pathName,
        documentId,
        documentVersion,
        groupVersion: version,
        groupEid,
        group: hmGroup(group),
      }
    }),
  get: procedure
    .input(
      z.object({
        groupEid: z.string(),
      }),
    )
    .query(async ({input}) => {
      console.log('will getGroup with id', input)
      const group = await groupsClient.getGroup({
        id: `${HYPERMEDIA_GROUP_PREFIX}${input.groupEid}`,
      })
      console.log('did get group', hmGroup(group))
      return {
        group: hmGroup(group),
      }
    }),
  listContent: procedure
    .input(
      z.object({
        groupEid: z.string(),
      }),
    )
    .query(async ({input}) => {
      const list = await groupsClient.listContent({
        id: `${HYPERMEDIA_GROUP_PREFIX}${input.groupEid}`,
      })
      const listedDocs = await Promise.all(
        Object.entries(list.content).map(async ([pathName, pubUrl]) => {
          const [docId, version] = getIdsfromUrl(pubUrl)
          if (!docId || !version) return null // version is required for group content

          const pub = await publicationsClient.getPublication({
            documentId: docId,
            version,
          })
          return {
            pathName,
            docId,
            version,
            publication: hmPublication(pub),
          }
        }),
      )

      return listedDocs.sort((a, b) => {
        const aTitle = a?.publication?.document?.title
        const bTitle = b?.publication?.document?.title
        if (!aTitle || !bTitle) return 0
        return aTitle.localeCompare(bTitle)
      })
    }),
  listMembers: procedure
    .input(
      z.object({
        groupEid: z.string(),
      }),
    )
    .query(async ({input}) => {
      const list = await groupsClient.listMembers({
        id: `${HYPERMEDIA_GROUP_PREFIX}${input.groupEid}`,
      })
      return Object.entries(list.members || {}).map(([account, role]) => ({
        account,
        role,
      }))
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
        account: hmAccount(account),
      }
    }),
})

const siteInfoRouter = router({
  get: procedure.query(async () => {
    const siteInfo = await getSiteInfo()
    return hmSiteInfo(siteInfo)
  }),
})

export const appRouter = router({
  publication: publicationRouter,
  account: accountRouter,
  group: groupRouter,
  siteInfo: siteInfoRouter,
})

export type AppRouter = typeof appRouter
