import {Change, HTTP_PORT} from '@mintter/shared'
import {useMutation, useQueries, useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import {useGRPCClient, useQueryInvalidator} from '../app-context'
import {useAccounts} from './accounts'
import {queryKeys} from './query-keys'

export function useDocHistory(docId?: string, variantVersion?: string) {
  const {data} = useEntityTimeline(docId)
  const changes = useMemo(() => {
    const allVariantChanges = new Set<string>()
    const variantVersionChanges: TimelineChange[] = []
    variantVersion
      ?.split('.')
      .map((chId) => data?.allChanges[chId])
      .forEach((ch) => {
        if (!ch) return
        variantVersionChanges.push(ch)
        allVariantChanges.add(ch.id)
      })
    let walkLeafVersions = variantVersionChanges
    while (walkLeafVersions?.length) {
      const nextLeafVersions: TimelineChange[] = []
      for (const change of walkLeafVersions) {
        change?.change.deps?.map((depChangeId) => {
          allVariantChanges.add(depChangeId)
          const depChange = data?.allChanges[depChangeId]
          if (depChange) {
            nextLeafVersions.push(depChange)
          }
        })
      }
      walkLeafVersions = nextLeafVersions
    }
    return [...allVariantChanges]
      .map((changeId) => data?.allChanges[changeId])
      .filter(Boolean)
      .sort((a, b) => {
        let dateA = a?.change.createTime ? a.change.createTime.toDate() : 0
        let dateB = b?.change.createTime ? b.change.createTime.toDate() : 1
        // @ts-ignore
        return dateB - dateA
      })
  }, [data, variantVersion])
  return changes
}

export type TimelineChange = {
  change: Change
  deps: string[]
  citations: string[]
  id: string
}

export function useEntityTimeline(entityId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: async () => {
      const rawTimeline = await grpcClient.entities.getEntityTimeline({
        id: entityId || '',
      })
      const timelineEntries = Object.entries(rawTimeline.changes)
      const allChanges: Record<string, TimelineChange> = {}
      timelineEntries.forEach(([changeId, change]) => {
        allChanges[changeId] = {
          deps: change.deps,
          citations: [],
          change: change,
          id: change.id,
        }
      })
      timelineEntries.forEach(([changeId, change]) => {
        change.deps.forEach((depId) => {
          allChanges[depId]?.citations.push(changeId)
        })
      })
      return {
        allChanges,
        authorVersions: rawTimeline.authorVersions,
        timelineEntries,
        heads: rawTimeline.heads,
      }
    },
    queryKey: [queryKeys.ENTITY_TIMELINE, entityId],
    enabled: !!entityId,
  })
}

export function useSuggestedChanges(docId?: string, variantVersion?: string) {
  const timeline = useEntityTimeline(docId)
  const {suggestedChanges, authorIds, alreadyMerged} = useMemo(() => {
    const alreadyMerged = new Set<string>()
    if (!variantVersion) return {}
    function collectAlreadyMerged(changeId: string) {
      alreadyMerged.add(changeId)
      const change = timeline.data?.allChanges[changeId]
      change?.deps.forEach(collectAlreadyMerged)
    }
    variantVersion.split('.').forEach(collectAlreadyMerged)
    const allDisplayHeads = new Set<string>()
    timeline.data?.heads.forEach((head) => {
      if (alreadyMerged.has(head)) return
      allDisplayHeads.add(head)
    })
    timeline.data?.authorVersions.forEach((authorVersion) => {
      authorVersion.heads.forEach((head) => {
        if (alreadyMerged.has(head)) return
        allDisplayHeads.add(head)
      })
    })
    const unmergedAuthorHeadChanges = [...allDisplayHeads]
      .map((changeId) => {
        return timeline.data?.allChanges[changeId]
      })
      .filter(Boolean)
    const authorIds = new Set<string>()
    unmergedAuthorHeadChanges.forEach((head) => {
      if (head) authorIds.add(head.change.author)
    })
    const suggestedChanges = unmergedAuthorHeadChanges?.map((change) => {
      if (!change) return null
      const flatDeps: TimelineChange[] = []
      const walkDeps = new Set(
        change.deps
          .map((depChangeId) => {
            if (alreadyMerged.has(depChangeId)) return null
            const depChange = timeline.data?.allChanges[depChangeId]
            if (depChange) flatDeps.push(depChange)
            return depChange
          })
          .filter(Boolean) as TimelineChange[],
      )
      while (walkDeps.size) {
        walkDeps.forEach((depChange) => {
          depChange.deps.forEach((depChangeId) => {
            if (alreadyMerged.has(depChangeId)) return
            const depChange = timeline.data?.allChanges[depChangeId]
            if (depChange) {
              flatDeps.push(depChange)
              walkDeps.add(depChange)
            }
          })
          walkDeps.delete(depChange)
        })
      }
      flatDeps.forEach((depChange) => {
        if (depChange) authorIds.add(depChange.change.author)
      })
      return {
        ...change,
        flatDeps,
      }
    })
    return {authorIds: [...authorIds], suggestedChanges, alreadyMerged}
  }, [docId, variantVersion, timeline.data])
  const authors = useAccounts(authorIds || [])
  const suggestedChangesWithAuthors = suggestedChanges?.map((change) => {
    if (!change) return null
    return {
      ...change,
      flatDeps: change.flatDeps.map((depChange) => {
        return {
          ...depChange,
          author: authors.find(
            (author) => author.data?.id === depChange.change.author,
          )?.data,
        }
      }),
      author: authors.find((author) => author.data?.id === change.change.author)
        ?.data,
    }
  })
  return {
    suggested: suggestedChangesWithAuthors,
    alreadyMerged,
    allChanges: timeline.data?.allChanges,
  }
}

export function useMergeChanges(documentId: string) {
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation({
    mutationFn: async (versions: string[]) => {
      await grpcClient.merge.mergeChanges({
        id: documentId,
        versions,
      })
    },
    onSuccess: () => {
      invalidate([queryKeys.GET_PUBLICATION, documentId])
      invalidate([queryKeys.GET_ACCOUNT_PUBLICATIONS])
      invalidate([queryKeys.GET_PUBLICATION_LIST])
      invalidate([queryKeys.FEED_LATEST_EVENT])
      invalidate([queryKeys.RESOURCE_FEED_LATEST_EVENT])
      invalidate([queryKeys.ENTITY_TIMELINE, documentId])
      invalidate([queryKeys.ENTITY_CITATIONS])
    },
  })
}

export function useChange(changeId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryFn: () =>
      grpcClient.entities.getChange({
        id: changeId || '',
      }),
    queryKey: [queryKeys.CHANGE, changeId],
    enabled: !!changeId,
  })
}
export type IPLDRef = {
  '/': string
}
export type IPLDBytes = {
  '/': {
    bytes: string
  }
}
export type IPLDNode = IPLDRef | IPLDBytes

export type ChangeBlob<EntitySchema> = {
  '@type': 'Change'
  // action: 'Update', // seems to appear on group changes but not account changes
  delegation: IPLDRef
  deps: IPLDRef[]
  entity: string // entity id like hm://d/123
  hlcTime: number
  patch: Partial<EntitySchema>
  sig: IPLDBytes
  signer: IPLDRef
}

export type ProfileSchema = {
  alias: string
  bio: string
  avatar: IPLDRef
}
export enum GroupRole {
  Owner = 1,
  Editor = 2,
}
export type GroupSchema = {
  siteURL: string
  owner: IPLDBytes
  nonce: IPLDBytes
  title: string
  description: string
  members: Record<
    string, // accountId
    GroupRole
  >
  content: Record<
    string, // pathName
    string // hm://d/123?v=123
  >
}

// todo, add KeyDelegationData CommentData and any other JSON blobs
export type ChangeData = ChangeBlob<ProfileSchema> | ChangeBlob<GroupSchema> // todo: add DocumentSchema
export type BlobData = ChangeData

function queryBlob(cid: string | undefined) {
  return {
    queryFn: async () => {
      const res = await fetch(`http://localhost:${HTTP_PORT}/debug/cid/${cid}`)
      const data = await res.json()
      return data as BlobData
    },
    queryKey: [queryKeys.BLOB_DATA, cid],
    enabled: !!cid,
  }
}

export function useBlobsData(cids?: string[]) {
  return useQueries({
    queries: cids?.map((cid) => queryBlob(cid)) || [],
  })
}

export function useBlobData(cid?: string) {
  return useQuery(queryBlob(cid))
}
