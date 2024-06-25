import {PartialMessage, Timestamp} from '@bufbuild/protobuf'
import {Event, ListEventsRequest, unpackHmId} from '@shm/shared'
import {useInfiniteQuery, useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {ChangeBlob, GroupSchema, useBlobsData} from './changes'
import {queryKeys} from './query-keys'

export function feedEventId(e: Event | undefined) {
  if (!e) return 'empty'
  if (e.data.case === 'newBlob') {
    return e.data.value.cid
  }
}

export function useFeedWithLatest(trustedOnly: boolean = false) {
  const grpcClient = useGRPCClient()
  const latestQuery = useQuery({
    queryKey: [queryKeys.FEED_LATEST_EVENT, trustedOnly],
    queryFn: async (context) => {
      const result = await grpcClient.activityFeed.listEvents({
        pageSize: 1,
        trustedOnly,
      })
      const event: Event | undefined = result.events[0]
      return feedEventId(event)
    },
    refetchInterval: 30_000,
  })
  const feed = useFeed(trustedOnly)
  return {
    ...feed,
    refetch: () => {
      feed.refetch()
      latestQuery.refetch()
    },
    hasNewItems:
      feed.firstEventId !== 'empty' &&
      !!latestQuery.data &&
      feed.firstEventId !== latestQuery.data,
  }
}
function feedFilterFromId(id?: string): PartialMessage<ListEventsRequest> {
  const hmId = id ? unpackHmId(id) : null
  return {
    filterResource: !id || hmId?.type === 'a' ? undefined : [id],
    filterUsers: hmId?.type === 'a' ? [hmId.eid] : undefined,
  }
}
export function useResourceFeedWithLatest(id?: string) {
  const grpcClient = useGRPCClient()
  const latestQuery = useQuery({
    queryKey: [queryKeys.RESOURCE_FEED_LATEST_EVENT, id],
    queryFn: async (context) => {
      const result = await grpcClient.activityFeed.listEvents({
        pageSize: 1,
        ...feedFilterFromId(id),
      })
      const event: Event | undefined = result.events[0]
      return feedEventId(event)
    },
    refetchInterval: 30_000,
  })
  const feed = useResourceFeed(id)
  return {
    ...feed,
    refetch: () => {
      feed.refetch()
      latestQuery.refetch()
    },
    hasNewItems:
      feed.firstEventId !== 'empty' &&
      !!latestQuery.data &&
      feed.firstEventId !== latestQuery.data,
  }
}

export function useResourceFeed(id?: string) {
  const grpcClient = useGRPCClient()
  const feedQuery = useInfiniteQuery({
    queryKey: [queryKeys.RESOURCE_FEED, id],
    queryFn: async (context) => {
      const feed = await grpcClient.activityFeed.listEvents({
        pageSize: 4,
        pageToken: context.pageParam,
        ...feedFilterFromId(id),
      })

      return feed
    },
    enabled: !!id,
    getNextPageParam: (lastPage) => {
      return lastPage.nextPageToken || undefined
    },
  })
  const allEvents = feedQuery.data?.pages.flatMap((page) => page.events) || []
  return {
    ...feedQuery,
    firstEventId: feedEventId(allEvents[0]),
    data: allEvents.filter((event) => {
      if (event.data.case === 'newBlob') {
        if (event.data.value.blobType === 'KeyDelegation') return false
      }
      return true
    }),
  }
}

export function useFeed(trustedOnly: boolean = false) {
  const grpcClient = useGRPCClient()
  const feedQuery = useInfiniteQuery({
    queryKey: [queryKeys.FEED, trustedOnly],
    queryFn: async (context) => {
      // await delay(2000)
      return await grpcClient.activityFeed.listEvents({
        pageSize: 4,
        pageToken: context.pageParam,
        trustedOnly,
      })
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPageToken || undefined
    },
  })
  const allEvents = feedQuery.data?.pages.flatMap((page) => page.events) || []
  const groupUpdateCids: string[] = []
  const updateCidTypes = new Map<string, string | undefined>()
  const updateEids = new Map<string, string | undefined>()
  const groupUpdateTimes = new Map<string, Timestamp | undefined>()
  allEvents.forEach((event) => {
    if (
      event.data.case === 'newBlob' &&
      event.data.value.blobType === 'Change'
    ) {
      const {eventTime} = event
      const id = unpackHmId(event.data.value.resource)
      updateCidTypes.set(event.data.value.cid, id?.type)
      updateEids.set(event.data.value.cid, id?.eid)
      if (id?.type === 'g') {
        groupUpdateCids.push(event.data.value.cid)
        groupUpdateTimes.set(event.data.value.cid, eventTime)
      }
    }
  })
  const groupUpdateBlobs = useBlobsData(groupUpdateCids)
  const timeMap = new Map<string, Timestamp>()
  groupUpdateCids.forEach((cid, i) => {
    const blobQuery = groupUpdateBlobs[i]
    const blob = blobQuery.data as ChangeBlob<GroupSchema>
    // see if group update has only one content update
    if (blob?.['@type'] === 'Change' && blob.patch.content) {
      const contentUpdates = Object.entries(blob.patch.content)
      if (contentUpdates.length === 1) {
        const [_key, value] = contentUpdates[0]
        const contentItemId = unpackHmId(value)
        const time = groupUpdateTimes.get(cid)
        if (contentItemId?.type === 'd' && time) {
          timeMap.set(`${contentItemId.eid}-${contentItemId.version}`, time)
        }
      }
    }
  })
  return {
    ...feedQuery,
    firstEventId: feedEventId(allEvents[0]),
    data: allEvents.filter((event) => {
      if (event.data.case === 'newBlob') {
        if (event.data.value.blobType === 'KeyDelegation') return false
        if (event.data.value.blobType === 'Change') {
          const type = updateCidTypes.get(event.data.value.cid)
          const eid = updateEids.get(event.data.value.cid)
          if (eid && type === 'd') {
            const groupContentUpdateTime = timeMap.get(
              `${eid}-${event.data.value.cid}`,
            )
            const groupUpdateTimeIsNear =
              !!groupContentUpdateTime &&
              !!event.eventTime &&
              timeStampsWithinSec(
                groupContentUpdateTime,
                event.eventTime,
                60 * 10,
              )
            return !groupUpdateTimeIsNear
          }
        }
        return true
      }
      return true
    }),
  }
}

function timeStampsWithinSec(a: Timestamp, b: Timestamp, sec: number) {
  if (!a) return false
  const aSec = a.seconds
  const bSec = b.seconds
  return Math.abs(Number(aSec - bSec)) < sec
}
