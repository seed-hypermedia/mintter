import {
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  BlockRange,
  ContentEmbed,
  EmbedAccountContent,
  EmbedGroupCardContent,
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
  ButtonText,
  FileWarning,
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
  copyUrlToClipboardWithFeedback,
  useMedia,
} from '@mintter/ui'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {
  PropsWithChildren,
  ReactNode,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {NextLink} from 'src/next-link'
import {AccountRow} from './account-row'
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
        Account: EmbedAccount,
        Group: EmbedGroup,
        Publication: EmbedPublication,
        Comment: EmbedComment,
        Inline: InlineEmbed,
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

function EmbedWrapper({
  viewType = 'content',
  ...props
}: PropsWithChildren<{hmRef: string; viewType?: 'content' | 'card'}>) {
  const {layoutUnit} = usePublicationContentContext()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sideannotationRef = useRef<HTMLDivElement>(null)
  const wrapperRect = useRef<DOMRect>()
  const sideRect = useRef<DOMRect>()
  const [sidePos, setSidePos] = useState<'bottom' | 'right'>('bottom')
  const media = useMedia()

  useEffect(() => {
    if (wrapperRef.current) {
      observeSize(wrapperRef.current, (rect) => {
        wrapperRect.current = rect
        console.log('OBSERVER', wrapperRect.current)
      })
    }
    if (sideannotationRef.current) {
      observeSize(sideannotationRef.current, (rect) => {
        sideRect.current = rect
        console.log('OBSERVER SIDE', sideRect.current)
      })
    }

    function onWindowResize() {
      if (wrapperRect.current && sideRect.current) {
        const isLg = media?.lg || false

        const targetSize = sideRect.current.width + 48
        const targetSpace = isLg
          ? window.innerWidth - wrapperRect.current.right
          : window.innerWidth - wrapperRect.current.right - 300
        setSidePos(targetSize < targetSpace ? 'right' : 'bottom')
      }
    }

    window.addEventListener('resize', onWindowResize, false)
    setTimeout(() => {
      onWindowResize()
    }, 500)

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
    }
  }, [wrapperRef, media])

  return (
    <NextLink
      href={stripHMLinkPrefix(props.hmRef)}
      style={{textDecoration: 'none', display: 'block', width: '100%'}}
    >
      <YStack
        ref={wrapperRef}
        {...blockStyles}
        className="block-embed"
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$backgroundHover',
        }}
        margin={0}
        mb="$2"
        // marginHorizontal={(-1 * layoutUnit) / 2}
        width={`calc(100% + ${layoutUnit})`}
        // padding={layoutUnit / 2}
        borderRadius={0}
        borderRightWidth={3}
        borderRightColor={'$blue8'}
        // overflow="hidden"
        // borderRadius={layoutUnit / 4}
      >
        {props.children && viewType == 'content'}
        <EmbedSideAnnotation
          ref={sideannotationRef}
          hmId={props.hmRef}
          sidePos={sidePos}
        />
      </YStack>
    </NextLink>
  )
}

export function EmbedPublication(props: EntityComponentProps) {
  if (props.block?.attributes?.view == 'card') {
    return <EmbedPublicationCard {...props} />
  } else if (props.block?.attributes?.view == 'content') {
    return <EmbedPublicationContent {...props} />
  }

  return <ErrorBlock message="EmbedPublication view error" />
}

function EmbedPublicationContent(props: EntityComponentProps) {
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

function EmbedPublicationCard(props: EntityComponentProps) {
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
    <EmbedWrapper hmRef={props.id} viewType="card">
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
  if (props.block?.attributes?.view == 'content') {
    return <EmbedGroupContent groupId={groupId} {...props} />
  } else if (props.block?.attributes?.view == 'card') {
    return <EmbedGroupCard groupId={groupId} {...props} />
  }

  return (
    <ErrorBlock
      message={`EmbedGroup view error: ${JSON.stringify(props.block)}`}
    />
  )
}

function EmbedGroupCard(
  props: EntityComponentProps & {groupId?: string; noContent?: boolean},
) {
  const groupQuery = trpc.group.get.useQuery({
    groupId,
    version: props.version || undefined,
  })

  if (groupQuery.isLoading) return <Spinner />
  if (groupQuery.error) return <ErrorBlock message={groupQuery.error.message} />
  const group = groupQuery.data?.group
  return group ? (
    <EmbedWrapper hmRef={props.id} viewType="card">
      <EmbedGroupCardContent group={group} />
      {props.noContent ? (
        <XStack p="$2" theme="red" gap="$2">
          <FileWarning size={14} />
          <SizableText size="$1">
            This group does not have a Homepage
          </SizableText>
        </XStack>
      ) : null}
    </EmbedWrapper>
  ) : (
    <ErrorBlock message="Failed to load group embed" />
  )
}

function EmbedGroupContent(props: EntityComponentProps & {groupId?: string}) {
  const groupFrontPage = useGroupFrontpage(
    props.groupId!,
    props.version || undefined,
  )
  if (groupFrontPage) {
    return <EmbedPublicationContent {...props} {...groupFrontPage} />
  }

  return <EmbedGroupCard noContent {...props} />
}

function useGroupFrontpage(groupId: string, version?: string) {
  const groupQuery = trpc.group.listContent.useQuery({
    groupId,
    version: version,
  })

  return useMemo(() => {
    const frontpage = groupQuery.data?.find((c) => c?.pathName == '/')
    if (frontpage) {
      return frontpage.docId
    }
    return null
  }, [groupQuery.data, groupQuery.status])
}

export function EmbedAccount(props: EntityComponentProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = trpc.account.get.useQuery({accountId})
  const account = accountQuery.data?.account
  if (accountQuery.isLoading) return <Spinner />
  if (accountQuery.error)
    return <ErrorBlock message={accountQuery.error.message} />
  if (account) {
    if (
      props.block?.attributes?.view == 'content' &&
      account.profile?.rootDocument
    ) {
      const unpackedRef = unpackHmId(account.profile?.rootDocument)
      return <EmbedPublicationContent {...props} {...unpackedRef} />
    } else if (props.block?.attributes?.view == 'card') {
      return (
        <EmbedWrapper hmRef={props.id} viewType="card">
          <EmbedAccountContent account={account} />
        </EmbedWrapper>
      )
    }
  }
  return (
    <EmbedWrapper hmRef={props.id} viewType="card">
      <EmbedAccountContent account={account} />
      <XStack p="$2" theme="red" gap="$2">
        <FileWarning size={14} />
        <SizableText size="$1">
          This account does not have a Profile page
        </SizableText>
      </XStack>
    </EmbedWrapper>
  )
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}

export function InlineEmbed(props: InlineEmbedComponentProps) {
  if (props?.type == 'a') {
    return <AccountInlineEmbed {...props} />
  } else if (props?.type == 'd') {
    return <PublicationInlineEmbed {...props} />
  } else if (props?.type == 'g') {
    return <GroupInlineEmbed {...props} />
  } else {
    console.error('Inline Embed Error', JSON.stringify(props))
    return <InlineEmbedButton href="">??</InlineEmbedButton>
  }
}

// ----

export function AccountInlineEmbed(props: InlineEmbedComponentProps) {
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

function GroupInlineEmbed(props: InlineEmbedComponentProps) {
  const groupId = props?.type == 'g' ? props.qid : undefined
  if (!groupId) throw new Error('Invalid props at GroupInlineEmbed (groupId)')
  const groupQuery = trpc.group.get.useQuery({
    groupId,
    version: props?.version || undefined,
  })
  return (
    <InlineEmbedButton
      href={`/g/${groupId}${props?.version ? `?v=${props.version}` : ''}`}
    >
      {(groupQuery &&
        groupQuery.status == 'success' &&
        groupQuery.data?.group?.title) ||
        `${groupId?.slice(0, 5) + '...' + groupId?.slice(-5)}`}
    </InlineEmbedButton>
  )
}

function PublicationInlineEmbed(props: InlineEmbedComponentProps) {
  const pubId = props?.type == 'd' ? props.qid : undefined
  if (!pubId) throw new Error('Invalid props at PublicationInlineEmbed (pubId)')
  const pubQuery = trpc.publication.get.useQuery({
    documentId: pubId,
    versionId: props?.version || undefined,
  })

  return (
    <InlineEmbedButton
      href={`/d/${pubId}${props?.version ? `?v=${props.version}` : ''}`}
    >
      {(pubQuery &&
        pubQuery.status == 'success' &&
        pubQuery.data?.publication?.document?.title) ||
        `${pubId?.slice(0, 5) + '...' + pubId?.slice(-5)}`}
    </InlineEmbedButton>
  )
}

// ----

function observeSize(element: HTMLDivElement, callback: (r: DOMRect) => void) {
  const ro = new ResizeObserver(() => {
    const r = element.getBoundingClientRect()
    callback(r)
  })
  ro.observe(element)
}

const EmbedSideAnnotation = forwardRef<
  HTMLDivElement,
  {hmId: string; sidePos: 'bottom' | 'right'}
>(function EmbedSideAnnotation({hmId, sidePos}, ref) {
  const unpacked = unpackHmId(hmId)
  if (unpacked && unpacked.type != 'd') return null
  const pub = trpc.publication.get.useQuery({
    documentId: unpacked?.qid,
    versionId: unpacked?.version || undefined,
  })

  const editors = pub.data?.publication?.document?.editors

  // @ts-expect-error
  const sideStyles: YStackProps =
    sidePos == 'right'
      ? {
          position: 'absolute',
          top: 32,
          right: -16,
          transform: 'translateX(100%)',
        }
      : {}

  return (
    <YStack
      ref={ref}
      p="$2"
      flex="none"
      className="embed-side-annotation"
      width="max-content"
      maxWidth={300}
      {...sideStyles}
    >
      {/* <XStack ai="center" gap="$2" bg="green"> */}
      <SizableText size="$1" fontWeight="600">
        {pub?.data?.publication?.document?.title}
      </SizableText>
      <SizableText size="$1" color="$color9">
        {formattedDateMedium(pub.data?.publication?.document?.updateTime)}
      </SizableText>
      {/* <SizableText fontSize={12} color="$color9">
          {formattedDateMedium(pub.data?.document?.publishTime)}
        </SizableText> */}
      {/* </XStack> */}
      <XStack
        marginHorizontal="$2"
        gap="$2"
        ai="center"
        paddingVertical="$1"
        alignSelf="flex-start"
      >
        <XStack ai="center">
          {editors?.filter(Boolean).map(
            (editorAccount, idx) =>
              editorAccount && (
                <XStack
                  zIndex={idx + 1}
                  key={editorAccount}
                  borderColor="$background"
                  backgroundColor="$background"
                  borderWidth={2}
                  borderRadius={100}
                  marginLeft={-8}
                >
                  <AccountRow onlyAvatar account={editorAccount} />
                </XStack>
              ),
          )}
        </XStack>
      </XStack>
    </YStack>
  )
})

function InlineEmbedButton({children, href}: {children: string; href: string}) {
  return (
    <Link href={href} style={{all: 'unset'}}>
      <ButtonText
        textDecorationColor={'$mint11'}
        color="$mint11"
        className="hm-link"
        fontSize="$5"
      >
        {children}
      </ButtonText>
    </Link>
  )
}
