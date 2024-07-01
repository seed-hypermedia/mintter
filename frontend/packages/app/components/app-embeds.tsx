import {
  API_FILE_URL,
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  ContentEmbed,
  EmbedAccountContent,
  EmbedGroupCardContent,
  EntityComponentProps,
  ErrorBlock,
  InlineEmbedComponentProps,
  PublicationCardView,
  UnpackedHypermediaId,
  blockStyles,
  createHmId,
  formattedDateMedium,
  getBlockNodeById,
  unpackHmId,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  FileWarning,
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
} from '@mintter/ui'
import {ArrowUpRightSquare} from '@tamagui/lucide-icons'
import {
  ComponentProps,
  PropsWithChildren,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {YStackProps} from 'tamagui'
import {useAccount, useAccounts} from '../models/accounts'
import {useComment} from '../models/comments'
import {usePublication} from '../models/documents'
import {useGroup, useGroupFrontpage} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {getAvatarUrl} from '../utils/account-url'
import {useNavRoute} from '../utils/navigation'
import {getRouteContext, useOpenInContext} from '../utils/route-context'
import {useNavigate} from '../utils/useNavigate'
import {BaseAccountLinkAvatar} from './account-link-avatar'
import {Avatar} from './avatar'

function EmbedWrapper({
  hmRef,
  parentBlockId,
  children,
  depth,
  viewType = 'content',
  ...props
}: PropsWithChildren<
  {
    hmRef: string
    parentBlockId: string | null
    depth?: number
    viewType?: 'content' | 'card'
  } & ComponentProps<typeof YStack>
>) {
  const {
    disableEmbedClick = false,
    comment,
    routeParams,
  } = usePublicationContentContext()
  const route = useNavRoute()
  const open = useOpenInContext()
  const navigate = useNavigate('replace')
  const unpackRef = unpackHmId(hmRef)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const sideannotationRef = useRef<HTMLDivElement>(null)
  const wrapperRect = useRef<DOMRect>()
  const sideRect = useRef<DOMRect>()
  const [sidePos, setSidePos] = useState<'bottom' | 'right'>('bottom')
  const [isHighlight, setHighlight] = useState(false)

  useEffect(() => {
    const val =
      (routeParams?.documentId == unpackRef?.qid &&
        routeParams?.version == unpackRef?.version &&
        comment) ||
      false

    if (val) {
      setTimeout(() => {
        setHighlight(false)
      }, 1000)
    }

    setHighlight(val)
  }, [
    routeParams?.documentId,
    routeParams?.version,
    comment,
    unpackRef?.qid,
    unpackRef?.version,
  ])

  useEffect(() => {
    if (wrapperRef.current) {
      observeSize(wrapperRef.current, (rect) => {
        wrapperRect.current = rect
      })
    }
    if (sideannotationRef.current) {
      observeSize(sideannotationRef.current, (rect) => {
        sideRect.current = rect
      })
    }

    function onWindowResize() {
      if (wrapperRect.current && sideRect.current) {
        const targetSize = sideRect.current.width + 48
        setSidePos(
          targetSize < window.innerWidth - wrapperRect.current.right
            ? 'right'
            : 'bottom',
        )
      }
    }

    window.addEventListener('resize', onWindowResize, false)
    setTimeout(() => {
      onWindowResize()
    }, 500)

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
    }
  }, [wrapperRef])

  return (
    <YStack
      ref={wrapperRef}
      contentEditable={false}
      userSelect="none"
      {...blockStyles}
      className="block-embed"
      data-content-type="embed"
      data-url={hmRef}
      data-view={viewType}
      backgroundColor={
        isHighlight
          ? routeParams?.blockRef == unpackRef?.blockRef
            ? '$yellow3'
            : '$backgroundTransparent'
          : '$backgroundTransparent'
      }
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: isHighlight
          ? routeParams?.blockRef == unpackRef?.blockRef
            ? '$yellow4'
            : '$backgroundTransparent'
          : '$backgroundTransparent',
        // borderRadius: '$2',
        // borderRightColor: depth == 1 ? '$blue7' : undefined,
      }}
      margin={0}
      // marginHorizontal={-1 * layoutUnit}

      // padding={layoutUnit / 2}
      // overflow="hidden"
      borderRadius={0}
      borderRightWidth={3}
      borderRightColor={'$blue8'}
      // borderLeftWidth={6}
      // borderLeftColor={isHighlight ? '$yellow6' : '$color4'}
      onPress={
        !disableEmbedClick
          ? () => {
              // if (comment && route.key == 'publication' && route.documentId == )
              // open(hmRef, true)
              if (comment) {
                if (
                  route.key == 'publication' &&
                  unpackRef?.qid == route.documentId
                ) {
                  navigate({
                    ...route,
                    blockId: unpackRef?.blockRef!,
                    versionId: unpackRef?.version!,
                  })
                }
              } else {
                open(hmRef, parentBlockId)
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
      {!comment && viewType == 'content' ? (
        <EmbedSideAnnotation
          sidePos={sidePos}
          ref={sideannotationRef}
          hmId={hmRef}
        />
      ) : null}
    </YStack>
  )
}

export function observeSize(
  element: HTMLElement,
  callback: (r: DOMRect) => void,
) {
  const ro = new ResizeObserver(() => {
    const r = element.getBoundingClientRect()
    callback(r)
  })
  ro.observe(element)
  return () => ro.disconnect()
}

export function useSizeObserver(onRect: (rect: DOMRect) => void) {
  const widthObserver = useRef<null | (() => void)>(null)
  return (el: HTMLElement | null) => {
    if (!el) return
    widthObserver.current?.()
    widthObserver.current = observeSize(el, onRect)
  }
}

const EmbedSideAnnotation = forwardRef<
  HTMLDivElement,
  {hmId: string; sidePos: 'bottom' | 'right'}
>(function EmbedSideAnnotation({hmId, sidePos}, ref) {
  const unpacked = unpackHmId(hmId)

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

  if (unpacked && unpacked.type == 'c')
    return (
      <CommentSideAnnotation
        ref={ref}
        unpackedRef={unpacked}
        sideStyles={sideStyles}
      />
    )
  if (unpacked && unpacked.type != 'd') return null
  const pub = usePublication({
    id: unpacked?.qid,
    version: unpacked?.version || undefined,
  })
  const editors = useAccounts(pub.data?.document?.editors || [])

  return (
    <YStack
      ref={ref}
      p="$2"
      flex="none"
      className="embed-side-annotation"
      width="max-content"
      maxWidth={300}
      group="item"
      {...sideStyles}
    >
      {/* <XStack ai="center" gap="$2" bg="green"> */}
      <SizableText size="$1" fontWeight="600">
        {pub?.data?.document?.title}
      </SizableText>
      {/* <SizableText fontSize={12} color="$color9">
          {formattedDateMedium(pub.data?.document?.publishTime)}
        </SizableText> */}
      {/* </XStack> */}
      <SizableText size="$1" color="$color9">
        {formattedDateMedium(pub.data?.document?.updateTime)}
      </SizableText>
      <XStack
        marginHorizontal="$2"
        gap="$2"
        ai="center"
        paddingVertical="$1"
        alignSelf="flex-start"
      >
        <XStack ai="center">
          {editors
            .map((editor) => editor.data)
            .filter(Boolean)
            .map(
              (editorAccount, idx) =>
                editorAccount?.id && (
                  <XStack
                    zIndex={idx + 1}
                    key={editorAccount?.id}
                    borderColor="$background"
                    backgroundColor="$background"
                    borderWidth={2}
                    borderRadius={100}
                    marginLeft={-8}
                  >
                    <BaseAccountLinkAvatar
                      account={editorAccount}
                      accountId={editorAccount?.id}
                    />
                  </XStack>
                ),
            )}
        </XStack>
      </XStack>
      <SizableText
        size="$1"
        color="$blue9"
        opacity={0}
        $group-item-hover={{opacity: 1}}
      >
        Go to Document →
      </SizableText>
    </YStack>
  )
})

const CommentSideAnnotation = forwardRef(function CommentSideAnnotation(
  props: {unpackedRef?: UnpackedHypermediaId; sideStyles: YStackProps},
  ref,
) {
  const comment = useComment(props.unpackedRef?.id)

  const unpackedTarget = useMemo(() => {
    if (comment && comment.data?.target) {
      return unpackHmId(comment.data.target)
    } else {
      return null
    }
  }, [comment])

  const pubTarget = usePublicationVariant({
    documentId: unpackedTarget?.qid,
    versionId: unpackedTarget?.version || undefined,
    variants: unpackedTarget?.variants || [],
  })

  const editors = useAccounts(
    pubTarget.data?.publication?.document?.editors || [],
  )

  return null
  if (pubTarget.status == 'success') {
    return (
      <YStack
        ref={ref}
        p="$2"
        flex="none"
        className="embed-side-annotation"
        width="max-content"
        maxWidth={300}
        group="item"
        {...props.sideStyles}
      >
        {/* <XStack ai="center" gap="$2" bg="green"> */}
        <SizableText size="$1">
          comment on{' '}
          <SizableText size="$1" fontWeight="600">
            {pubTarget?.data?.publication?.document?.title}
          </SizableText>
        </SizableText>
        {/* <SizableText fontSize={12} color="$color9">
            {formattedDateMedium(pub.data?.document?.publishTime)}
          </SizableText> */}
        {/* </XStack> */}
        <SizableText size="$1" color="$color9">
          {formattedDateMedium(
            pubTarget.data?.publication?.document?.updateTime,
          )}
        </SizableText>
        <XStack
          marginHorizontal="$2"
          gap="$2"
          ai="center"
          paddingVertical="$1"
          alignSelf="flex-start"
        >
          <XStack ai="center">
            {editors
              .map((editor) => editor.data)
              .filter(Boolean)
              .map(
                (editorAccount, idx) =>
                  editorAccount?.id && (
                    <XStack
                      zIndex={idx + 1}
                      key={editorAccount?.id}
                      borderColor="$background"
                      backgroundColor="$background"
                      borderWidth={2}
                      borderRadius={100}
                      marginLeft={-8}
                    >
                      <BaseAccountLinkAvatar
                        account={editorAccount}
                        accountId={editorAccount?.id}
                      />
                    </XStack>
                  ),
              )}
          </XStack>
        </XStack>
        <SizableText
          size="$1"
          color="$blue9"
          opacity={0}
          $group-item-hover={{opacity: 1}}
        >
          Go to Document →
        </SizableText>
      </YStack>
    )
  }

  return null
})

export function EmbedPublication(props: EntityComponentProps) {
  if (props.block.attributes?.view == 'card') {
    return <EmbedPublicationCard {...props} />
  } else {
    return <EmbedPublicationContent {...props} />
  }
}

export function EmbedPublicationContent(props: EntityComponentProps) {
  const documentId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const [showReferenced, setShowReferenced] = useState(false)
  const pub = usePublicationVariant({
    documentId,
    versionId:
      showReferenced && props.version
        ? props.version
        : props.latest
        ? undefined
        : props.version || undefined,
    variants: props.variants || undefined,
    enabled: !!documentId,
  })
  const route = useNavRoute()
  const navigate = useNavigate()
  return (
    <ContentEmbed
      props={props}
      isLoading={pub.isInitialLoading}
      showReferenced={showReferenced}
      onShowReferenced={setShowReferenced}
      pub={pub.data?.publication}
      EmbedWrapper={EmbedWrapper}
      parentBlockId={props.parentBlockId}
      renderOpenButton={() =>
        documentId && (
          <Button
            size="$2"
            icon={ArrowUpRightSquare}
            onPress={() => {
              if (!documentId) return
              navigate({
                key: 'publication',
                documentId,
                variants: props.variants || undefined,
                versionId: props.version || undefined,
                context: getRouteContext(
                  route,
                  props.parentBlockId || undefined,
                ),
              })
            }}
          >
            Open Document
          </Button>
        )
      }
    />
  )
}

export function EmbedPublicationCard(props: EntityComponentProps) {
  // we can't pass anything else to `createHmId` because this is creating the string we need to pass to getPublication
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = usePublicationVariant({
    documentId: docId,
    versionId: props.latest ? undefined : props.version || undefined,
    variants: props.variants || undefined,
    enabled: !!docId,
  })
  let textContent = useMemo(() => {
    if (pub.data?.publication?.document?.children) {
      let content = ''
      pub.data?.publication?.document?.children.forEach((bn) => {
        content += bn.block?.text + ' '
      })
      return content
    }
  }, [pub.data])

  return (
    <EmbedWrapper
      hmRef={props.id}
      parentBlockId={props.parentBlockId}
      viewType={props.block.attributes?.view == 'card' ? 'card' : 'content'}
    >
      <PublicationCardView
        title={pub.data?.publication?.document?.title}
        textContent={textContent}
        editors={pub.data?.publication?.document?.editors || []}
        AvatarComponent={AvatarComponent}
        date={pub.data?.publication?.document?.updateTime}
      />
    </EmbedWrapper>
  )
}

export function EmbedAccount(
  props: EntityComponentProps,
  parentBlockId: string | null,
) {
  console.log(`== ~ props EmbedAccount:`, props)
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = useAccount(accountId)

  if (accountQuery.status == 'success') {
    if (
      props.block?.attributes?.view == 'content' &&
      accountQuery.data?.profile?.rootDocument
    ) {
      const unpackedRef = unpackHmId(accountQuery.data?.profile?.rootDocument)
      return <EmbedPublicationContent {...props} {...unpackedRef} />
    } else if (props.block?.attributes?.view == 'card') {
      return (
        <EmbedWrapper
          hmRef={props.id}
          parentBlockId={parentBlockId}
          viewType="card"
        >
          <EmbedAccountContent account={accountQuery.data!} />
        </EmbedWrapper>
      )
    }

    return (
      <EmbedWrapper
        hmRef={props.id}
        parentBlockId={parentBlockId}
        viewType="card"
      >
        <EmbedAccountContent account={accountQuery.data!} />
        <XStack p="$2" theme="red" gap="$2">
          <FileWarning size={14} />
          <SizableText size="$1">
            This account does not have a Profile page
          </SizableText>
        </XStack>
      </EmbedWrapper>
    )
  }
}

export function EmbedComment(props: EntityComponentProps) {
  if (props?.type !== 'c')
    throw new Error('Invalid props as ref for EmbedComment')
  const comment = useComment(createHmId('c', props.eid), {
    enabled: !!props,
  })
  let embedBlocks = useMemo(() => {
    const selectedBlock =
      props.blockRef && comment.data?.content
        ? getBlockNodeById(comment.data.content, props.blockRef)
        : null

    const embedBlocks = selectedBlock ? [selectedBlock] : comment.data?.content

    return embedBlocks
  }, [props.blockRef, comment.data])
  const account = useAccount(comment.data?.author)
  if (comment.isLoading) return <Spinner />
  return (
    <EmbedWrapper hmRef={props.id} parentBlockId={props.parentBlockId}>
      <XStack flexWrap="wrap" jc="space-between" p="$3">
        <XStack gap="$2">
          <UIAvatar
            label={account.data?.profile?.alias}
            id={account.data?.id}
            url={
              account.data?.profile?.avatar
                ? `${API_FILE_URL}/${account.data?.profile?.avatar}`
                : undefined
            }
          />
          <SizableText>{account.data?.profile?.alias}</SizableText>
        </XStack>
        {comment.data?.createTime ? (
          <SizableText fontSize="$2" color="$color10">
            {formattedDateMedium(comment.data.createTime)}
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
              parentBlockId={props.id}
            />
          ))}
        </BlockNodeList>
      ) : (
        <BlockContentUnknown {...props} />
      )}
    </EmbedWrapper>
  )
}

function AvatarComponent({accountId}: {accountId: string}) {
  let {data: account} = useAccount(accountId)
  return (
    <Avatar
      label={account?.profile?.alias}
      id={accountId}
      url={getAvatarUrl(account?.profile?.avatar)}
    />
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

export function EmbedGroupCard(
  props: EntityComponentProps & {groupId?: string; noContent?: boolean},
) {
  const groupQuery = useGroup(props.groupId, props.version || undefined)

  const group = groupQuery.data

  return group && groupQuery.status == 'success' ? (
    <EmbedWrapper
      hmRef={props.id}
      parentBlockId={props.parentBlockId}
      viewType="card"
    >
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
    props.groupId,
    props.version || undefined,
  )

  if (groupFrontPage) {
    return <EmbedPublicationContent {...props} {...groupFrontPage} />
  }

  return <EmbedGroupCard noContent {...props} />
}

export function EmbedInline(props: InlineEmbedComponentProps) {
  if (props?.type == 'a') {
    return <AccountInlineEmbed {...props} />
  } else if (props?.type == 'g') {
    return <GroupInlineEmbed {...props} />
  } else if (props?.type == 'd') {
    return <PublicationInlineEmbed {...props} />
  } else {
    console.error('Inline Embed Error', JSON.stringify(props))
    return <InlineEmbedButton>??</InlineEmbedButton>
  }
}

function AccountInlineEmbed(props: InlineEmbedComponentProps) {
  const accountId = props?.type == 'a' ? props.eid : undefined
  if (!accountId)
    throw new Error('Invalid props at AccountInlineEmbed (accountId)')
  const accountQuery = useAccount(accountId)
  const navigate = useNavigate()
  return (
    <InlineEmbedButton
      dataRef={props?.id}
      onPress={() => navigate({key: 'account', accountId})}
    >
      {(accountId &&
        accountQuery.status == 'success' &&
        `@${accountQuery.data?.profile?.alias}`) ||
        `@${accountId?.slice(0, 5) + '...' + accountId?.slice(-5)}`}
    </InlineEmbedButton>
  )
}

function GroupInlineEmbed(props: InlineEmbedComponentProps) {
  const groupId = props?.type == 'g' ? props.qid : undefined
  if (!groupId) throw new Error('Invalid props at GroupInlineEmbed (groupId)')
  const groupQuery = useGroup(groupId)
  const navigate = useNavigate()
  return (
    <InlineEmbedButton
      dataRef={props?.id}
      onPress={() => navigate({key: 'group', groupId})}
    >
      {(groupQuery &&
        groupQuery.status == 'success' &&
        groupQuery.data?.title) ||
        `${groupId?.slice(0, 5) + '...' + groupId?.slice(-5)}`}
    </InlineEmbedButton>
  )
}

function PublicationInlineEmbed(props: InlineEmbedComponentProps) {
  const pubId = props?.type == 'd' ? props.qid : undefined
  if (!pubId) throw new Error('Invalid props at PublicationInlineEmbed (pubId)')
  const pubQuery = usePublication({
    id: pubId,
    version: props?.version || undefined,
  })
  const navigate = useNavigate()
  return (
    <InlineEmbedButton
      dataRef={props?.id}
      onPress={() =>
        navigate({
          key: 'publication',
          documentId: pubId,
          versionId: props?.version || undefined,
        })
      }
    >
      {(pubQuery &&
        pubQuery.status == 'success' &&
        pubQuery.data?.document?.title) ||
        `${pubId?.slice(0, 5) + '...' + pubId?.slice(-5)}`}
    </InlineEmbedButton>
  )
}

function InlineEmbedButton({
  children,
  dataRef,
  onPress,
}: {
  children: string
  dataRef: string
  onPress?: () => void
}) {
  return (
    <Button
      onPress={onPress}
      bg="$backgroundTransparent"
      hoverStyle={{
        bg: '$backgroundTransparent',
      }}
      unstyled
      style={{
        display: 'inline-block',
        lineHeight: 1,
        border: 'none',
      }}
    >
      <ButtonText
        textDecorationColor={'$mint11'}
        color="$mint11"
        className="hm-link"
        fontSize="$5"
        data-inline-embed={dataRef}
      >
        {children}
      </ButtonText>
    </Button>
  )
}
