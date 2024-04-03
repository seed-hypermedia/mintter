import {
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  BlockRange,
  ContentEmbed,
  EmbedContentAccount,
  EmbedContentGroup,
  EntityComponentProps,
  ErrorBlock,
  ExpandedBlockRange,
  InlineEmbedComponentProps,
  PublicationCardView,
  PublicationContentProvider,
  UnpackedHypermediaId,
  blockStyles,
  contentLayoutUnit,
  contentTextUnit,
  createHmId,
  createPublicWebHmUrl,
  formattedDateMedium,
  getBlockNodeById,
  isHypermediaScheme,
  unpackHmId,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
  copyUrlToClipboardWithFeedback,
} from '@mintter/ui'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {PropsWithChildren, ReactNode, useMemo, useState} from 'react'
import {NextLink} from 'src/next-link'
import {trpc} from './trpc'

export function SitePublicationContentProvider({
  children,
  unpackedId,
}: {
  children: ReactNode
  unpackedId: UnpackedHypermediaId | null
}) {
  const router = useRouter()
  return (
    <PublicationContentProvider
      showDevMenu={process.env.NODE_ENV == 'development'}
      debugTop={-80}
      layoutUnit={contentLayoutUnit}
      textUnit={contentTextUnit}
      debug={false}
      entityComponents={{
        AccountCard: EmbedAccount,
        GroupCard: EmbedGroup,
        PublicationContent: EmbedPublicationContent,
        PublicationCard: EmbedPublicationCard,
        CommentCard: EmbedComment,
        InlineEmbed: SiteInlineEmbed,
      }}
      onLinkClick={(href, e) => {
        e.stopPropagation()
        const isHmHref = isHypermediaScheme(href)
        const id = unpackHmId(href)
        // if the user is pressing a modifier, the browser will open the actual link href in a new tab.
        // external links are also handled with the default browser href behavior
        // we can open parsable hypermedia links as a router push for a smoother transition.
        if (e.metaKey || e.ctrlKey || !isHmHref || !id) return
        // only in the case of hypermedia IDs do we want to explicitly push the route.
        e.preventDefault()
        const dest = createPublicWebHmUrl(id.type, id.eid, {
          version: id.version,
          hostname: null,
          blockRef: id.blockRef,
        })
        router.push(dest)
      }}
      saveCidAsFile={async (cid: string, fileName: string) => {
        const aElement = document.createElement('a')
        aElement.setAttribute('download', fileName)
        aElement.href = `/ipfs/${cid}`
        aElement.setAttribute('target', '_blank')
        aElement.click()
      }}
      onCopyBlock={(
        blockId: string,
        blockRange: BlockRange | ExpandedBlockRange | undefined,
      ) => {
        if (unpackedId) {
          copyUrlToClipboardWithFeedback(
            createPublicWebHmUrl('d', unpackedId.eid, {
              version: unpackedId.version,
              blockRef: blockId,
              blockRange,
              hostname: window.location.origin,
            }),
            'Block',
          )
        }
      }}
      ipfsBlobPrefix="/ipfs/"
    >
      {children}
    </PublicationContentProvider>
  )
}

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  const {layoutUnit} = usePublicationContentContext()
  return (
    <NextLink
      href={stripHMLinkPrefix(props.hmRef)}
      style={{textDecoration: 'none', display: 'block', width: '100%'}}
    >
      <YStack
        {...blockStyles}
        className="block-embed"
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$color5',
        }}
        margin={0}
        mb="$2"
        marginHorizontal={(-1 * layoutUnit) / 2}
        width={`calc(100% + ${layoutUnit})`}
        padding={layoutUnit / 2}
        overflow="hidden"
        borderRadius={layoutUnit / 4}
      >
        {props.children}
      </YStack>
    </NextLink>
  )
}

export function EmbedPublicationContent(props: EntityComponentProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const [showReferenced, setShowReferenced] = useState(false)
  const pub = trpc.publication.getVariant.useQuery(
    {
      documentId: docId,
      versionId: props.version,
      variants: props.variants,
      latest: props.latest && !showReferenced,
    },
    {
      enabled: !!docId,
    },
  )
  const pubData = pub.data?.publication
  return (
    <ContentEmbed
      props={props}
      isLoading={pub.isInitialLoading}
      showReferenced={showReferenced}
      onShowReferenced={setShowReferenced}
      pub={pubData}
      EmbedWrapper={EmbedWrapper}
      renderOpenButton={() => null}
    />
  )
}

export function EmbedPublicationCard(props: EntityComponentProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = trpc.publication.getVariant.useQuery(
    {
      documentId: docId,
      versionId: props.version,
      variants: props.variants,
      latest: props.latest,
    },
    {
      enabled: !!docId,
    },
  )

  const pubData = pub.data?.publication

  let textContent = useMemo(() => {
    if (pubData?.document?.children?.length) {
      let content = ''
      pubData?.document?.children.forEach((bn) => {
        if (bn.block.text) {
          content += bn.block.text + ' '
        }
      })
      return content
    }
  }, [pubData])

  if (pub.isLoading) return <Spinner />
  if (pub.error) return <ErrorBlock message={pub.error.message} />

  return (
    <EmbedWrapper hmRef={props.id}>
      <PublicationCardView
        title={pubData?.document?.title}
        textContent={textContent}
        editors={pubData?.document?.editors}
        AvatarComponent={AvatarComponent}
      />
    </EmbedWrapper>
  )
}

function AvatarComponent({accountId}: {accountId?: string}) {
  let {data} = trpc.account.get.useQuery({accountId})
  return (
    <UIAvatar
      label={data?.account?.profile?.alias}
      id={accountId}
      url={
        data?.account?.profile?.avatar
          ? `/ipfs/${data?.account?.profile?.avatar}`
          : undefined
      }
    />
  )
}

export function EmbedComment(props: EntityComponentProps) {
  if (props?.type !== 'c')
    throw new Error('Invalid props as ref for EmbedComment')
  const commentQuery = trpc.comment.get.useQuery({
    id: createHmId('c', props.eid),
  })
  const comment = commentQuery.data

  let embedBlocks = useMemo(() => {
    const selectedBlock =
      props.blockRef && comment?.content
        ? getBlockNodeById(comment?.content, props.blockRef)
        : null

    const embedBlocks = selectedBlock ? [selectedBlock] : comment?.content

    return embedBlocks
  }, [props.blockRef, comment])
  const accountQuery = trpc.account.get.useQuery({accountId: comment?.author})
  const account = accountQuery.data?.account
  if (commentQuery.isLoading) return <Spinner />
  return (
    <EmbedWrapper hmRef={props.id}>
      <XStack flexWrap="wrap" jc="space-between">
        <XStack gap="$2">
          <UIAvatar
            label={account?.profile?.alias}
            id={account?.id}
            url={
              account?.profile?.avatar
                ? `/ipfs/${account?.profile?.avatar}`
                : undefined
            }
          />
          <SizableText>{account?.profile?.alias}</SizableText>
        </XStack>
        {comment?.createTime ? (
          <SizableText fontSize="$2" color="$color10">
            {formattedDateMedium(comment?.createTime)}
          </SizableText>
        ) : null}
      </XStack>
      {embedBlocks?.length ? (
        <BlockNodeList childrenType="group">
          {embedBlocks.map((bn, idx) => (
            <BlockNodeContent
              isFirstChild={idx === 0}
              key={bn.block?.id}
              depth={1}
              blockNode={bn}
              childrenType="group"
              index={idx}
              embedDepth={1}
            />
          ))}
        </BlockNodeList>
      ) : (
        <BlockContentUnknown {...props} />
      )}
    </EmbedWrapper>
  )
}

export function EmbedGroup(props: EntityComponentProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = trpc.group.get.useQuery({groupId, version: ''})

  if (groupQuery.isLoading) return <Spinner />
  if (groupQuery.error) return <ErrorBlock message={groupQuery.error.message} />
  const group = groupQuery.data?.group
  return group ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentGroup group={group} />
    </EmbedWrapper>
  ) : (
    <ErrorBlock message="Failed to load group embed" />
  )
}

export function EmbedAccount(props: EntityComponentProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = trpc.account.get.useQuery({accountId})
  const account = accountQuery.data?.account
  if (accountQuery.isLoading) return <Spinner />
  if (accountQuery.error)
    return <ErrorBlock message={accountQuery.error.message} />
  return account ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentAccount account={account} />
    </EmbedWrapper>
  ) : (
    <ErrorBlock message="Failed to account embed" />
  )
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}

export function SiteInlineEmbed(props: InlineEmbedComponentProps) {
  const accountId = props?.type == 'a' ? props.eid : undefined
  const accountQuery = trpc.account.get.useQuery({accountId})
  const account = accountQuery.data?.account
  return (
    <Link href={`/a/${accountId}`} style={{all: 'unset'}}>
      <SizableText
        textDecorationColor={'$mint11'}
        color="$mint11"
        className="hm-link"
        fontSize="$5"
        hoverStyle={{
          cursor: 'pointer',
        }}
      >
        {(accountId &&
          accountQuery.status == 'success' &&
          `@${account?.profile?.alias}`) ||
          `@${accountId?.slice(0, 5) + '...' + accountId?.slice(-5)}`}
      </SizableText>
    </Link>
  )
}
