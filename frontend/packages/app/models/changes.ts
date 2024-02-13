import {Change, HTTP_PORT} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useMemo} from 'react'
import {useGRPCClient} from '../app-context'
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
      }
    },
    queryKey: [queryKeys.ENTITY_TIMELINE, entityId],
    enabled: !!entityId,
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

export function useChangeData(changeId?: string) {
  return useQuery({
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:${HTTP_PORT}/debug/cid/${changeId}`,
      )
      const data = await res.json()
      return data
    },
    queryKey: [queryKeys.CHANGE_DATA, changeId],
    enabled: !!changeId,
  })
}
