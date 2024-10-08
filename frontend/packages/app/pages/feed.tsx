import {Timestamp} from '@bufbuild/protobuf'
import {
  API_FILE_URL,
  ActivityEvent,
  BlocksContent,
  Group,
  HMComment,
  HMPublication,
  PublicationContent,
  PublicationVariant,
  UnpackedHypermediaId,
  clipContentBlocks,
  formattedDateLong,
  hmId,
  pluralS,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Globe,
  List,
  PageContainer,
  RadioButtons,
  Section,
  SizableText,
  Spinner,
  TextProps,
  Theme,
  UIAvatar,
  View,
  XStack,
  YStack,
  toast,
} from '@mintter/ui'
import {ArrowRight, ChevronUp, Verified} from '@tamagui/lucide-icons'
import React, {PropsWithChildren, ReactNode} from 'react'
import {VirtuosoHandle} from 'react-virtuoso'
import Footer from '../components/footer'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useAccount} from '../models/accounts'
import {GroupSchema, ProfileSchema, useBlobData} from '../models/changes'
import {useComment} from '../models/comments'
import {usePublication} from '../models/documents'
import {useFeedWithLatest, useResourceFeedWithLatest} from '../models/feed'
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

function HiddenFeedItem() {
  // invisible feed item. height is non-zero because the Virtualized warning
  return <View height={1} />
}

function FeedItemInnerContainer(props) {
  return (
    <YStack
      bg="$color1"
      borderRadius="$2"
      f={1}
      jc="flex-start"
      // group="item"
      {...props}
    />
  )
}

function FeedItemFooter(props) {
  return (
    <YStack borderTopColor="$borderColor" borderTopWidth={1} {...props}>
      <XStack
        p="$2"
        jc="center"
        gap="$2"
        // opacity={0}
        // $group-item-hover={{opacity: 1}}
      >
        {props.children}
      </XStack>
    </YStack>
  )
}

function FeedItemContainer({
  children,
  linkId,
  maxContentHeight,
  footer,
  header,
}: {
  children?: ReactNode
  linkId?: UnpackedHypermediaId
  maxContentHeight?: number
  footer?: ReactNode
  header?: ReactNode
}) {
  const navigate = useNavigate('push')
  return (
    <PageContainer f={1} marginBottom="$4">
      <FeedItemInnerContainer
        cursor={linkId ? 'pointer' : 'default'}
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
        {header}
        <YStack
          maxHeight={maxContentHeight}
          f={1}
          p="$4"
          alignSelf="stretch"
          overflow="hidden"
          className="feed-item-container"
        >
          {children}
        </YStack>
        {footer}
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
  ...props
}: TextProps & {
  id: UnpackedHypermediaId
  children: ReactNode
}) {
  const navigate = useNavigate('push')
  return (
    <ButtonText
      style={{whiteSpace: 'break-spaces'}}
      fontWeight={'bold'}
      onPress={(e) => {
        e.stopPropagation()
        const route = appRouteOfId(id)
        if (route) {
          navigate(route)
        } else {
          toast.error('Failed to resolve a route for this')
        }
      }}
      numberOfLines={1}
      textOverflow="ellipsis" // not working. long titles don't look great
      {...props}
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
    <XStack
      gap="$3"
      ai="center"
      f={1}
      padding="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
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

const FEED_MAX_BLOCK_COUNT = 10

function FeedItemPublicationContent({
  publication,
}: {
  publication: HMPublication
}) {
  return (
    <AppPublicationContentProvider renderOnly>
      <PublicationContent
        marginVertical={0}
        publication={publication}
        maxBlockCount={FEED_MAX_BLOCK_COUNT}
      />
    </AppPublicationContentProvider>
  )
}

function FeedItemCommentContent({comment}: {comment: HMComment}) {
  return (
    <AppPublicationContentProvider renderOnly>
      <YStack
        paddingHorizontal={12}
        $gtMd={{paddingHorizontal: 24}}
        marginVertical={0}
      >
        <BlocksContent
          blocks={clipContentBlocks(comment.content, FEED_MAX_BLOCK_COUNT)}
          parentBlockId={null}
        />
      </YStack>
    </AppPublicationContentProvider>
  )
}

function HMLinkButton({
  to,
  children,
}: PropsWithChildren<{to: UnpackedHypermediaId}>) {
  const navigate = useNavigate('push')
  return (
    <Button
      chromeless
      icon={ArrowRight}
      size="$2"
      onPress={(e) => {
        e.stopPropagation()
        const route = appRouteOfId(to)
        if (route) {
          navigate(route)
        } else {
          toast.error('Failed to resolve a route for this')
        }
      }}
    >
      {children}
    </Button>
  )
}

function DocChangeFeedItem({id, eventTime, cid, author}: ChangeFeedItemProps) {
  const pub = usePublication({id: id.qid, version: cid})
  const linkId = hmId('d', id.eid, {
    version: cid,
    variants: [{key: 'author', author}],
  })
  const account = useAccount(author)
  const isProfileUpdate = account.data?.profile?.rootDocument === id.qid
  if (pub.data?.document?.title === '(HIDDEN) Group Navigation')
    return <HiddenFeedItem />
  const message = isProfileUpdate ? 'updated their profile' : 'updated'
  return (
    <FeedItemContainer
      linkId={linkId}
      maxContentHeight={400}
      header={
        <FeedItemHeader
          author={author}
          eventTime={eventTime}
          message={
            <>
              {message}{' '}
              <EntityLink id={linkId}>
                {pub.data?.document?.title || 'Untitled Document'}
              </EntityLink>
            </>
          }
        />
      }
      footer={
        <FeedItemFooter>
          <HMLinkButton to={linkId}>Open Document</HMLinkButton>
        </FeedItemFooter>
      }
    >
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
  if (!docId) {
    return (
      <ErrorFeedItem
        message={`Unhandled Group Content Change: unrecognized content URL for ${pathName}: ${contentUrl}`}
      />
    )
  }
  if (pub.data?.document?.title === '(HIDDEN) Group Navigation')
    return <HiddenFeedItem />
  return (
    <FeedItemContainer
      linkId={linkId}
      maxContentHeight={400}
      header={
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
      }
      footer={
        <FeedItemFooter>
          {linkId && (
            <HMLinkButton to={linkId}>Open Group Document</HMLinkButton>
          )}
        </FeedItemFooter>
      }
    >
      {pub.data && <FeedItemPublicationContent publication={pub.data} />}
    </FeedItemContainer>
  )
}

function GroupChangeFeedItem(props: ChangeFeedItemProps) {
  const {id, eventTime, cid, author} = props
  const group = useGroup(id.qid, cid)
  const groupChange = useBlobData(cid)
  if (groupChange.isInitialLoading) return <Spinner />
  // @ts-expect-error
  const patchEntries = Object.entries(groupChange.data?.patch)
  if (patchEntries.length === 0)
    return (
      <ErrorFeedItem message="Unrecognized Group Change: no patch entries" />
    )
  const contentPatch = patchEntries.find(([key]) => key === 'content')
  const contentUpdate = contentPatch?.[1]
  const contentEntries = Object.entries(contentUpdate || {})
  const linkId = hmId('g', id.eid, {version: cid})
  if (group.data && patchEntries.length === 1 && contentEntries.length === 1) {
    const [pathName, contentUrl] = contentEntries[0]
    if (contentUrl === '') {
      return (
        <FeedItemContainer
          linkId={linkId}
          header={
            <FeedItemHeader
              author={author}
              eventTime={eventTime}
              message={
                <>
                  removed {pathName} from{' '}
                  <EntityLink id={linkId}>
                    {group.data?.title || 'Untitled Group'}
                  </EntityLink>
                </>
              }
            />
          }
        />
      )
    }
    return (
      <GroupContentChangeFeedItem
        {...props}
        pathName={pathName}
        contentUrl={contentUrl}
        group={group.data}
      />
    )
  }
  const removalContentEntry = contentEntries.find(
    ([key, value]) => value === '',
  )
  const newContentEntry = contentEntries.find(([key, value]) => value !== '')
  const newContentId = unpackHmId(newContentEntry?.[1])
  // detecting if a simple path rename happened
  if (
    group.data &&
    patchEntries.length === 1 &&
    contentEntries.length === 2 &&
    removalContentEntry &&
    newContentEntry &&
    newContentId
  ) {
    const docLinkId = hmId('d', newContentId.eid, {
      version: newContentId.version,
      variants: [
        {key: 'group', groupId: linkId.qid, pathName: newContentEntry[0]},
      ],
    })
    return (
      <FeedItemContainer
        linkId={linkId}
        header={
          <FeedItemHeader
            author={author}
            eventTime={eventTime}
            message={
              <>
                renamed "{removalContentEntry[0]}" to{' '}
                <EntityLink id={docLinkId}>{newContentEntry[0]}</EntityLink> in{' '}
                <EntityLink id={linkId}>
                  {group.data?.title || 'Untitled Group'}
                </EntityLink>
              </>
            }
          />
        }
      ></FeedItemContainer>
    )
  }
  // @ts-expect-error
  const updates = getPatchedGroupEntries(groupChange.data?.patch || {}, id.qid)
  if (groupChange.data && updates.length === 0)
    console.warn('No updates found for group change', groupChange.data?.patch)
  return (
    <FeedItemContainer
      linkId={linkId}
      header={
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
      }
    >
      <UpdatesList updates={updates} />
    </FeedItemContainer>
  )
}

function UpdatesList({
  updates,
}: {
  updates: {labelKey: string; content: ReactNode}[]
}) {
  return (
    <YStack marginVertical="$4" gap="$2">
      {updates.map((entry) => {
        return (
          <XStack
            key={entry.labelKey}
            gap="$4"
            ai="center"
            marginHorizontal="$8"
          >
            <SizableText fontWeight="bold">{entry.labelKey}</SizableText>
            {entry.content}
          </XStack>
        )
      })}
    </YStack>
  )
}

function getPatchedAccountEntries(
  patch: Partial<ProfileSchema>,
): {labelKey: string; content: ReactNode}[] {
  const entries: {labelKey: string; content: ReactNode}[] = []
  if (patch.alias) {
    entries.push({
      labelKey: 'Alias',
      content: <SizableText>{patch.alias}</SizableText>,
    })
  }
  if (patch.bio) {
    entries.push({
      labelKey: 'Bio',
      content: <SizableText>{patch.bio}</SizableText>,
    })
  }
  if (patch.avatar) {
    entries.push({
      labelKey: 'Avatar',
      content: (
        <UIAvatar size={80} url={`${API_FILE_URL}/${patch.avatar['/']}`} />
      ),
    })
  }
  return entries
}

function AccountEntityLink({id}: {id: string}) {
  const account = useAccount(id)
  return (
    <EntityLink id={hmId('a', id)}>{account.data?.profile?.alias}</EntityLink>
  )
}

function PublicationLink({
  id,
  variants,
}: {
  id: UnpackedHypermediaId
  variants: PublicationVariant[] | undefined
}) {
  const pub = usePublication({
    id: id?.qid,
    version: id?.version || undefined,
  })
  return (
    <EntityLink id={{...id, variants}}>{pub.data?.document?.title}</EntityLink>
  )
}

function getPatchedGroupEntries(
  patch: Partial<GroupSchema>,
  groupId: string,
): {labelKey: string; content: ReactNode}[] {
  const entries: {labelKey: string; content: ReactNode}[] = []
  if (patch.title) {
    entries.push({
      labelKey: 'Title',
      content: <SizableText>{patch.title}</SizableText>,
    })
  }
  if (patch.description) {
    entries.push({
      labelKey: 'Description',
      content: <SizableText>{patch.description}</SizableText>,
    })
  }
  if (patch.members) {
    const memberEntries = Object.entries(patch.members)
    entries.push({
      labelKey: `Added ${pluralS(memberEntries.length, 'Editor')}`,
      content: (
        <SizableText>
          {memberEntries
            .map(([accountId, groupRole], index) => {
              return [
                <AccountEntityLink key={index} id={accountId} />,
                index === memberEntries.length - 1 ? '' : ', ',
              ]
            })
            .flat()}
        </SizableText>
      ),
    })
  }
  if (patch.siteURL) {
    entries.push({
      labelKey: 'Site URL',
      content: <SizableText>{patch.siteURL}</SizableText>,
    })
  }
  if (patch.content) {
    Object.entries(patch.content).forEach(([pathName, contentUrl]) => {
      const labelKey = pathName === '/' ? 'Front Page' : pathName
      const docId = unpackHmId(contentUrl)
      if (docId)
        entries.push({
          labelKey,
          content: (
            <PublicationLink
              id={docId}
              variants={[{key: 'group', groupId, pathName}]}
            />
          ),
        })
    })
  }
  return entries
}

function AccountChangeFeedItem({
  id,
  eventTime,
  cid,
  author,
}: ChangeFeedItemProps) {
  const accountChange = useBlobData(cid)
  if (accountChange.isInitialLoading) return <Spinner />
  // @ts-expect-error
  const updates = getPatchedAccountEntries(accountChange.data?.patch || {})
  if (updates.length === 0) return <HiddenFeedItem />
  return (
    <FeedItemContainer
      linkId={id}
      header={
        <FeedItemHeader
          author={author}
          eventTime={eventTime}
          message="updated their profile"
        />
      }
    >
      <UpdatesList updates={updates} />
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
    <FeedItemContainer
      linkId={id}
      maxContentHeight={400}
      header={
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
      }
      footer={
        <FeedItemFooter>
          <HMLinkButton to={id}>Open Comment</HMLinkButton>
        </FeedItemFooter>
      }
    >
      {comment.data && <FeedItemCommentContent comment={comment.data} />}
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

export const FeedItem = React.memo(function FeedItem({
  event,
}: {
  event: ActivityEvent
}) {
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
})

export function NewUpdatesButton({onPress}: {onPress: () => void}) {
  return (
    <XStack
      position="absolute"
      top={0}
      right={0}
      left={0}
      padding="$4"
      jc="center"
      pointerEvents="box-none"
    >
      <Theme inverse>
        <Button size="$2" onPress={onPress} icon={ChevronUp}>
          New Updates
        </Button>
      </Theme>
    </XStack>
  )
}

const Feed = React.memo(function Feed({tab}: {tab: 'trusted' | 'all'}) {
  const feed = useFeedWithLatest(tab === 'trusted')
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const scrollRef = React.useRef<VirtuosoHandle>(null)
  if (route.key !== 'feed') throw new Error('invalid route')
  return (
    <YStack f={1} gap="$3">
      <List
        ref={scrollRef}
        header={
          <PageContainer marginVertical="$6">
            <Section paddingVertical={0}>
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
            </Section>
          </PageContainer>
        }
        footer={<FeedPageFooter feedQuery={feed} />}
        items={feed.data || []}
        renderItem={({item}) => <FeedItem event={item} />}
        onEndReached={() => {
          feed.fetchNextPage()
        }}
      />
      {feed.hasNewItems && (
        <NewUpdatesButton
          onPress={() => {
            scrollRef.current?.scrollTo({top: 0})
            feed.refetch()
          }}
        />
      )}
    </YStack>
  )
})

export function FeedPageFooter({
  feedQuery,
}: {
  feedQuery:
    | ReturnType<typeof useFeedWithLatest>
    | ReturnType<typeof useResourceFeedWithLatest>
}) {
  return feedQuery.data?.length ? (
    <XStack jc="center" gap="$3" paddingVertical="$6">
      {feedQuery.isFetchingNextPage || feedQuery.isLoading ? (
        <Spinner />
      ) : feedQuery.hasNextPage ? (
        <Button size="$2" onPress={() => feedQuery.fetchNextPage()}>
          Load More Items
        </Button>
      ) : (
        <ButtonText>End of Feed.</ButtonText>
      )}
    </XStack>
  ) : null
}

export const ResourceFeed = React.memo(function ResourceFeed({
  id,
}: {
  id: string
}) {
  const scrollRef = React.useRef<VirtuosoHandle>(null)
  const feed = useResourceFeedWithLatest(id)
  return (
    <YStack f={1} gap="$3">
      <List
        ref={scrollRef}
        header={<View height="$2" />}
        footer={<FeedPageFooter feedQuery={feed} />}
        items={feed.data || []}
        renderItem={({item}) => <FeedItem event={item} />}
        onEndReached={() => {
          feed.fetchNextPage()
        }}
      />
      {feed.hasNewItems && (
        <NewUpdatesButton
          onPress={() => {
            scrollRef.current?.scrollTo({top: 0})
            feed.refetch()
          }}
        />
      )}
    </YStack>
  )
})
