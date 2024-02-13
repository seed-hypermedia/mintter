import {Timestamp} from '@bufbuild/protobuf'
import {
  API_FILE_URL,
  ActivityEvent,
  BlocksContent,
  Group,
  Publication,
  PublicationContent,
  UnpackedHypermediaId,
  formattedDateLong,
  hmId,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  FeedList,
  Globe,
  PageContainer,
  RadioButtons,
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
  styled,
  toast,
} from '@mintter/ui'
import {Verified} from '@tamagui/lucide-icons'
import {ReactNode} from 'react'
import Footer from '../components/footer'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useAccount} from '../models/accounts'
import {useChangeData} from '../models/changes'
import {useComment} from '../models/comments'
import {usePublication} from '../models/documents'
import {useFeed} from '../models/feed'
import {useGroup} from '../models/groups'
import {appRouteOfId, useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {AppPublicationContentProvider} from './publication-content-provider'

const feedTabsOptions = [
  {key: 'trusted', label: 'Trusted Content', icon: Verified},
  {key: 'all', label: 'All Content', icon: Globe},
] as const

export default function FeedPage() {
  const route = useNavRoute()
  if (route.key !== 'feed') throw new Error('invalid route')
  return (
    <>
      <MainWrapperNoScroll>
        <Feed tab={route.tab} />
      </MainWrapperNoScroll>
      <Footer />
    </>
  )
}

const FeedItemInnerContainer = styled(YStack, {
  gap: '$2',
  backgroundColor: '$color1',
  padding: '$3',
  borderRadius: '$2',
  overflow: 'hidden',
})

function FeedItemContainer({
  children,
  linkId,
}: {
  children: ReactNode
  linkId?: UnpackedHypermediaId
}) {
  const navigate = useNavigate('push')
  return (
    <PageContainer f={1} marginVertical="$2">
      <FeedItemInnerContainer
        onPress={
          linkId
            ? () => {
                const route = appRouteOfId(linkId)
                if (route) {
                  navigate(route)
                } else {
                  toast.error('Failed to resolve a route for this')
                }
              }
            : undefined
        }
      >
        {children}
      </FeedItemInnerContainer>
    </PageContainer>
  )
}

type ChangeFeedItemProps = {
  id: UnpackedHypermediaId
  eventTime: Timestamp | undefined
  cid: string
  author: string
}

type CommentFeedItemProps = {
  id: UnpackedHypermediaId
  eventTime: Timestamp | undefined
  cid: string
  author: string
}

function EntityLink({
  id,
  children,
}: {
  id: UnpackedHypermediaId
  children: ReactNode
}) {
  const navigate = useNavigate('push')
  return (
    <ButtonText
      fontWeight={'bold'}
      onPress={() => {
        const route = appRouteOfId(id)
        if (route) {
          navigate(route)
        } else {
          toast.error('Failed to resolve a route for this')
        }
      }}
      numberOfLines={1}
      textOverflow="ellipsis" // not working. long titles don't look great
    >
      {children}
    </ButtonText>
  )
}

function FeedItemHeader({
  author,
  eventTime,
  message,
}: {
  author: string
  eventTime?: Timestamp
  message: ReactNode
}) {
  const navigate = useNavigate('push')
  const account = useAccount(author)
  return (
    <XStack gap="$3" ai="center" f={1}>
      <UIAvatar
        id={account.data?.id || ''}
        size={30}
        url={
          account.data?.profile?.avatar &&
          `${API_FILE_URL}/${account.data?.profile?.avatar}`
        }
        label={account.data?.profile?.alias || account.data?.id}
        onPress={() => {
          navigate({key: 'account', accountId: author})
        }}
      />
      <YStack f={1}>
        <SizableText size="$3">
          <EntityLink id={hmId('a', author)}>
            {account.data?.profile?.alias || 'Unknown'}
          </EntityLink>{' '}
          {message}
        </SizableText>
        <SizableText size="$3" color="$color10">
          {formattedDateLong(eventTime)}
        </SizableText>
      </YStack>
    </XStack>
  )
}

function FeedItemPublicationContent({publication}: {publication: Publication}) {
  return (
    <AppPublicationContentProvider>
      <PublicationContent publication={publication} />
    </AppPublicationContentProvider>
  )
}

function DocChangeFeedItem({id, eventTime, cid, author}: ChangeFeedItemProps) {
  const pub = usePublication({id: id.qid, version: cid})
  const linkId = hmId('d', id.eid, {version: cid})
  return (
    <FeedItemContainer linkId={linkId}>
      <FeedItemHeader
        author={author}
        eventTime={eventTime}
        message={
          <>
            updated{' '}
            <EntityLink id={linkId}>
              {pub.data?.document?.title || 'Untitled Document'}
            </EntityLink>
          </>
        }
      />
      {pub.data && <FeedItemPublicationContent publication={pub.data} />}
    </FeedItemContainer>
  )
}

function GroupContentChangeFeedItem({
  id,
  eventTime,
  cid,
  author,
  pathName,
  contentUrl,
  group,
}: ChangeFeedItemProps & {pathName: string; contentUrl: string; group: Group}) {
  const docId = unpackHmId(contentUrl)
  const pub = usePublication({
    id: docId?.qid,
    version: docId?.version || undefined,
  })
  const linkId = docId
    ? {
        ...docId,
        variants: [{key: 'group', groupId: group.id, pathName} as const],
      }
    : undefined
  if (!docId)
    return (
      <ErrorFeedItem
        message={`Unhandled Group Content Change: unrecognized content URL: ${contentUrl}`}
      />
    )
  return (
    <FeedItemContainer linkId={linkId}>
      <FeedItemHeader
        author={author}
        eventTime={eventTime}
        message={
          <>
            updated{' '}
            {linkId ? (
              <EntityLink id={linkId}>
                {pub.data?.document?.title || 'Untitled Document'}
              </EntityLink>
            ) : (
              'entry'
            )}{' '}
            in{' '}
            <EntityLink id={hmId('g', id.eid, {version: cid})}>
              {group.title || 'Untitled Group'}
            </EntityLink>
          </>
        }
      />
      {pub.data && <FeedItemPublicationContent publication={pub.data} />}
    </FeedItemContainer>
  )
}

function GroupChangeFeedItem(props: ChangeFeedItemProps) {
  const {id, eventTime, cid, author} = props
  const group = useGroup(id.qid, cid)
  const groupChange = useChangeData(cid)
  if (groupChange.isInitialLoading) return <Spinner />
  if (groupChange.data?.action !== 'Update')
    return (
      <ErrorFeedItem message="Unrecognized Group Change: not an Update Action" />
    )
  const patchEntries = Object.entries(groupChange.data?.patch)
  if (patchEntries.length === 0)
    return (
      <ErrorFeedItem message="Unrecognized Group Change: no patch entries" />
    )
  const contentPatch = patchEntries.find(([key]) => key === 'content')
  const contentUpdate = contentPatch?.[1]
  const contentEntries = Object.entries(contentUpdate || {})
  const nonContentPatchEntries = patchEntries.filter(
    ([key]) => key !== 'content',
  )
  if (group.data && patchEntries.length === 1 && contentEntries.length === 1) {
    const [pathName, contentUrl] = contentEntries[0]
    return (
      <GroupContentChangeFeedItem
        {...props}
        pathName={pathName}
        contentUrl={contentUrl}
        group={group.data}
      />
    )
  }
  const linkId = hmId('g', id.eid, {version: cid})
  return (
    <FeedItemContainer linkId={linkId}>
      <FeedItemHeader
        author={author}
        eventTime={eventTime}
        message={
          <>
            updated{' '}
            <EntityLink id={linkId}>
              {group.data?.title || 'Untitled Group'}
            </EntityLink>
          </>
        }
      />
      <code>{JSON.stringify(nonContentPatchEntries, null, 2)}</code>
    </FeedItemContainer>
  )
}

function AccountChangeFeedItem({
  id,
  eventTime,
  cid,
  author,
}: ChangeFeedItemProps) {
  return (
    <FeedItemContainer linkId={id}>
      <FeedItemHeader
        author={author}
        eventTime={eventTime}
        message="updated their profile"
      />
    </FeedItemContainer>
  )
}

function CommentFeedItem({id, eventTime, cid, author}: CommentFeedItemProps) {
  const comment = useComment(id.qid)
  const targetDocId =
    comment.data?.target == null ? null : unpackHmId(comment.data?.target)
  const targetDoc = usePublication({
    id: targetDocId?.qid,
    version: targetDocId?.version || undefined,
  })
  return (
    <FeedItemContainer linkId={id}>
      <FeedItemHeader
        author={author}
        eventTime={eventTime}
        message={
          <>
            commented on{' '}
            {targetDocId ? (
              <EntityLink id={targetDocId}>
                {targetDoc.data?.document?.title}
              </EntityLink>
            ) : (
              'a document'
            )}
          </>
        }
      />
      {comment.data && (
        <>
          <AppPublicationContentProvider>
            <BlocksContent blocks={comment.data.content} />
          </AppPublicationContentProvider>
        </>
      )}
    </FeedItemContainer>
  )
}

function ErrorFeedItem({message}: {message: string}) {
  return (
    <FeedItemContainer>
      <SizableText color="$red10" fontWeight="bold">
        Failed to present this feed item.
      </SizableText>
      <SizableText color="$red10">{message}</SizableText>
    </FeedItemContainer>
  )
}

function FeedItem({event}: {event: ActivityEvent}) {
  const {data, eventTime} = event
  if (data.case === 'newBlob') {
    const {cid, author, resource, blobType} = data.value
    let hmId: UnpackedHypermediaId | null = null
    if (resource) {
      hmId = unpackHmId(resource)
    }
    const genericEvent = {id: hmId, eventTime, cid, author}
    if (hmId?.type === 'g' && blobType === 'Change') {
      return <GroupChangeFeedItem {...genericEvent} id={hmId} />
    }
    if (hmId?.type === 'd' && blobType === 'Change') {
      return <DocChangeFeedItem {...genericEvent} id={hmId} />
    }
    if (hmId?.type === 'a' && blobType === 'Change') {
      return <AccountChangeFeedItem {...genericEvent} id={hmId} />
    }
    if (hmId?.type === 'c' && blobType === 'Comment') {
      return <CommentFeedItem {...genericEvent} id={hmId} />
    }
    if (blobType === 'Change') {
      return <ErrorFeedItem message={`Unknown change type for ${hmId?.type}`} />
    }
    return <ErrorFeedItem message={`Unknown blob type: ${blobType}`} />
  }
  return <ErrorFeedItem message={`Unknown event type: ${event.data.case}`} />
}

function Feed({tab}: {tab: 'trusted' | 'all'}) {
  const feed = useFeed(tab === 'trusted')
  const route = useNavRoute()
  const replace = useNavigate('replace')
  if (route.key !== 'feed') throw new Error('invalid route')
  return (
    <YStack f={1} gap="$3">
      <FeedList
        header={
          <PageContainer marginVertical="$6">
            <XStack f={1} ai="center" gap="$3">
              <RadioButtons
                value={route.tab}
                options={feedTabsOptions}
                onValue={(tab) => {
                  replace({...route, tab})
                }}
              />
              {feed.isFetching ? <Spinner /> : null}
            </XStack>
          </PageContainer>
        }
        footer={
          feed.data?.pages?.length && (
            <XStack jc="center" gap="$3" paddingVertical="$6">
              {feed.isFetchingNextPage || feed.isLoading ? (
                <Spinner />
              ) : feed.hasNextPage ? (
                <Button size="$2" onPress={() => feed.fetchNextPage()}>
                  Load More Items
                </Button>
              ) : (
                <ButtonText>No more items in feed</ButtonText>
              )}
            </XStack>
          )
        }
        items={
          feed.data?.pages
            .map((page) => page.events)
            .flat()
            .filter((item) => {
              if (item.data.case === 'newBlob') {
                if (item.data.value.blobType === 'KeyDelegation') return false
                return true
              }
              return true
            }) || []
        }
        renderItem={({item}) => <FeedItem event={item} />}
        onEndReached={() => {
          feed.fetchNextPage()
        }}
      />
    </YStack>
  )
}
