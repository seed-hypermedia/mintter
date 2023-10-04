import {createHmId, unpackDocId, unpackHmId} from '@mintter/shared'
import {
  hmAccount,
  hmChangeInfo,
  hmGroup,
  hmLink,
  hmPublication,
} from 'server/to-json-hm'
import {HMAccount, HMChangeInfo} from 'server/json-hm'
import {z} from 'zod'
import {procedure, router} from '../trpc'
import {queryClient} from 'client'
import {Timestamp} from '@bufbuild/protobuf'

function errWrap<V>(failable: Promise<V>) {
  return failable.catch((e) => {
    // throw 'Caught this error.' + e.message
    // throw new Error('fails')
    return null
  })
}

const publicationRouter = router({
  getPathInfo: procedure
    .input(
      z.object({
        documentId: z.string(),
        versionId: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      // const records = await webClient.listWebPublicationRecords({
      //   documentId: input.documentId,
      //   version: input.versionId,
      // })
      // return {
      //   webPublications: records.publications,
      // }
      return null
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
      const resolvedPub = await queryClient.publications
        .getPublication({
          documentId: input.documentId,
          version: input.versionId || '',
        })
        .catch((e) => undefined)

      if (!resolvedPub) {
        return {publication: null}
      }
      return {
        publication: hmPublication(resolvedPub) || null,
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
      const pub = await queryClient.publications.getPublication({
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
      const citationList = await queryClient.contentGraph.listCitations({
        documentId: input.documentId,
      })
      return {
        citationLinks: citationList.links.map(hmLink),
      }
    }),

  // TODO: this is the versions logic we need to implement in the desktop app
  getChanges: procedure
    .input(
      z.object({
        documentId: z.string().optional(),
        version: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const pub = await queryClient.publications.getPublication({
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
      const {changes} = await queryClient.changes.listChanges({documentId})
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
        // versionChanges: the changes you are currently looking at (usually one but can be multiple versions)
        versionChanges: changeIdsToChanges(versionChanges),
        // deps: direct dependencies of the current version (going back in time)
        deps: changeIdsToChanges(Array.from(deps)),
        // downstreamChanges: changes after the current thing you are looking at (future changes)
        downstreamChanges: changeIdsToChanges(
          Array.from(downstreamChanges.get(version) || []).filter(
            (changeId) => !versionChangesSet.has(changeId),
          ),
        ),
        // allDeps: the full change that its forming the current version
        allDeps: changeIdsToChanges(allDeps),
        // the publication
        pub: hmPublication(pub),
      }
    }),
})

function sortDocuments(a?: string, b?: string) {
  let dateA = a ? new Date(a) : 0
  let dateB = b ? new Date(b) : 1

  // @ts-ignore
  return dateB - dateA
}

const groupRouter = router({
  getGroupPath: procedure
    .input(
      z.object({
        groupId: z.string(),
        pathName: z.string(),
        version: z.string().optional(),
      }),
    )
    .query(async ({input: {pathName, groupId, version}}) => {
      const groupContent = await queryClient.groups.listContent({
        id: groupId,
        version,
      })
      const group = await queryClient.groups.getGroup({
        id: groupId,
        version,
      })
      const item = groupContent.content[pathName]
      if (!item) return null
      const itemId = unpackDocId(item)
      if (!itemId?.version) return null // version is required for group content
      const pub = await queryClient.publications.getPublication({
        documentId: itemId.docId,
        version: itemId.version,
      })
      return {
        publication: hmPublication(pub),
        pathName,
        documentId: itemId.docId,
        documentVersion: itemId.version,
        groupVersion: version,
        group: hmGroup(group),
      }
    }),
  get: procedure
    .input(
      z.object({
        groupId: z.string().optional(),
        version: z.string(),
      }),
    )
    .query(async ({input}) => {
      const group = await errWrap(
        queryClient.groups.getGroup({
          id: input.groupId,
          version: input.version,
        }),
      )
      return {
        group: hmGroup(group),
      }
    }),
  listContent: procedure
    .input(
      z.object({
        groupId: z.string(),
        version: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const list = await queryClient.groups.listContent({
        id: input.groupId,
        version: input.version,
      })
      const listedDocs = await Promise.all(
        Object.entries(list.content)
          // .sort((a, b) => a[0]?.localeCompare(b[0])) // just to make it deterministic

          .map(async ([pathName, pubUrl]) => {
            const docId = unpackDocId(pubUrl)
            if (!docId?.version) return null // version is required for group content

            const pub = await queryClient.publications.getPublication({
              documentId: docId.docId,
              version: docId.version,
            })
            return {
              pathName,
              docId,
              version: docId.version,
              publication: hmPublication(pub),
            }
          }),
      )

      return listedDocs.sort((a, b) =>
        sortDocuments(
          a?.publication?.document?.updateTime,
          b?.publication?.document?.updateTime,
        ),
      )
    }),
  listMembers: procedure
    .input(
      z.object({
        groupId: z.string(),
        version: z.string().optional(),
      }),
    )
    .query(async ({input}) => {
      const list = await queryClient.groups.listMembers({
        id: input.groupId,
        // listMembers doesn't actually support version yet, whoops!!
        // version: input.version,
        version: '',
      })
      return Object.entries(list.members || {})
        .sort((a, b) => a[0]?.localeCompare(b[0])) // just to make it deterministic
        .map(([account, role]) => ({
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
        // version: z.string().optional(), // disabled because getAccount doesnt accept versions yet
      }),
    )
    .query(async ({input}) => {
      if (!input.accountId) return {account: null}
      let account: HMAccount | null = null
      try {
        const result = await queryClient.accounts.getAccount({
          id: input.accountId,
        })
        account = hmAccount(result)
      } catch (e) {
        if (e.message.match('[not_found]')) {
          const entityId = createHmId('a', input.accountId)
          let succeeded = false
          try {
            await queryClient.entities.discoverEntity({
              id: entityId,
              // version: input.version, // disabled because getAccount doesnt accept versions yet
            })
            succeeded = true
          } catch (e) {}
          if (succeeded) {
            try {
              const result = await queryClient.accounts.getAccount({
                id: input.accountId,
              })
              account = hmAccount(result)
            } catch (e) {}
          }
        }
      }
      console.log('getAccount!', account)
      return {
        account,
      }
    }),
})

const siteInfoRouter = router({
  get: procedure.query(async () => {
    const siteInfo = await queryClient.website.getSiteInfo({})
    const groupId = unpackHmId(siteInfo.groupId || '')

    const info = await queryClient.daemon.getInfo({})
    const peerInfo = await queryClient.networking.getPeerInfo({
      deviceId: info.deviceId,
    })

    return {
      groupEid: groupId?.eid || '',
      groupId: siteInfo.groupId,
      version: '', // so, this will result in the site querying the latest group
      p2pAddresses: peerInfo.addrs,
    }
  }),
})

export const appRouter = router({
  publication: publicationRouter,
  account: accountRouter,
  group: groupRouter,
  siteInfo: siteInfoRouter,
})

export type AppRouter = typeof appRouter
