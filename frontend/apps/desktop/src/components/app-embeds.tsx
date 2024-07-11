import {useAccount_deprecated} from '@/models/accounts'
import {useEntity} from '@/models/entities'
import {
  API_FILE_URL,
  BlockContentUnknown,
  BlockNodeContent,
  BlockNodeList,
  ContentEmbed,
  DocumentCardView,
  EmbedAccountContent,
  EntityComponentProps,
  InlineEmbedComponentProps,
  UnpackedHypermediaId,
  createHmId,
  formattedDateMedium,
  getBlockNodeById,
  getDocumentTitle,
  unpackHmId,
  useDocContentContext,
} from '@shm/shared'
import {blockStyles} from '@shm/shared/src/document-content'
import {
  Button,
  ButtonText,
  SizableText,
  Spinner,
  UIAvatar,
  XStack,
  YStack,
} from '@shm/ui'
import {ArrowUpRightSquare, FileWarning} from '@tamagui/lucide-icons'
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
import {useAccounts} from '../models/accounts'
import {useComment} from '../models/comments'
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
  } = useDocContentContext()
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
              if (comment) {
                if (
                  route.key == 'document' &&
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
  const entity = useEntity(unpacked)
  const editors = useAccounts(entity.data?.document?.authors || [])

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
        {getDocumentTitle(entity?.data?.document)}
      </SizableText>
      {/* <SizableText fontSize={12} color="$color9">
          {formattedDateMedium(pub.data?.document?.publishTime)}
        </SizableText> */}
      {/* </XStack> */}
      <SizableText size="$1" color="$color9">
        {formattedDateMedium(entity.data?.document?.updateTime)}
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

  const pubTarget = useEntity(unpackedTarget)

  const editors = useAccounts(pubTarget.data?.document?.authors || [])

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
            {getDocumentTitle(pubTarget?.data?.document)}
          </SizableText>
        </SizableText>
        {/* <SizableText fontSize={12} color="$color9">
            {formattedDateMedium(pub.data?.document?.publishTime)}
          </SizableText> */}
        {/* </XStack> */}
        <SizableText size="$1" color="$color9">
          {formattedDateMedium(pubTarget.data?.document?.updateTime)}
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

export function EmbedDocument(props: EntityComponentProps) {
  if (props.block.attributes?.view == 'card') {
    return <EmbedDocumentCard {...props} />
  } else {
    return <EmbedDocContent {...props} />
  }
}

export function EmbedDocContent(props: EntityComponentProps) {
  const [showReferenced, setShowReferenced] = useState(false)
  const doc = useEntity(props)
  const route = useNavRoute()
  const navigate = useNavigate()
  return (
    <ContentEmbed
      props={props}
      isLoading={doc.isInitialLoading}
      showReferenced={showReferenced}
      onShowReferenced={setShowReferenced}
      document={doc.data?.document}
      EmbedWrapper={EmbedWrapper}
      parentBlockId={props.parentBlockId}
      renderOpenButton={() => (
        <Button
          size="$2"
          icon={ArrowUpRightSquare}
          onPress={() => {
            if (!props.qid) return
            navigate({
              key: 'document',
              documentId: props.qid,
              versionId: props.version || undefined,
              context: getRouteContext(route, props.parentBlockId || undefined),
            })
          }}
        >
          Open Document
        </Button>
      )}
    />
  )
}

export function EmbedDocumentCard(props: EntityComponentProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const doc = useEntity(props)
  let textContent = useMemo(() => {
    if (doc.data?.document?.content) {
      let content = ''
      doc.data?.document?.content.forEach((bn) => {
        content += bn.block?.text + ' '
      })
      return content
    }
  }, [doc.data])

  return (
    <EmbedWrapper
      hmRef={props.id}
      parentBlockId={props.parentBlockId}
      viewType={props.block.attributes?.view == 'card' ? 'card' : 'content'}
    >
      <DocumentCardView
        title={getDocumentTitle(doc.data?.document)}
        textContent={textContent}
        editors={doc.data?.document?.authors || []}
        AvatarComponent={AvatarComponent}
        date={doc.data?.document?.updateTime}
      />
    </EmbedWrapper>
  )
}

export function EmbedAccount(
  props: EntityComponentProps,
  parentBlockId: string | null,
) {
  const profile = useEntity(props)

  if (profile.status == 'success') {
    const account =
      profile.data?.type === 'a' ? profile.data?.account : undefined
    if (!account) return null
    if (props.block?.attributes?.view == 'content' && profile.data) {
      return <EmbedDocContent {...props} />
    } else if (props.block?.attributes?.view == 'card') {
      return (
        <EmbedWrapper
          hmRef={props.id}
          parentBlockId={parentBlockId}
          viewType="card"
        >
          <EmbedAccountContent account={account} />
        </EmbedWrapper>
      )
    }

    return (
      <EmbedWrapper
        hmRef={props.id}
        parentBlockId={parentBlockId}
        viewType="card"
      >
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
  const account = useAccount_deprecated(comment.data?.author)
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
  let {data: account} = useAccount_deprecated(accountId)
  return (
    <Avatar
      label={account?.profile?.alias}
      id={accountId}
      url={getAvatarUrl(account?.profile?.avatar)}
    />
  )
}

export function EmbedInline(props: InlineEmbedComponentProps) {
  if (props?.type == 'a') {
    return <AccountInlineEmbed {...props} />
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
  const accountQuery = useAccount_deprecated(accountId)
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

function PublicationInlineEmbed(props: InlineEmbedComponentProps) {
  const pubId = props?.type == 'd' ? props.qid : undefined
  if (!pubId) throw new Error('Invalid props at PublicationInlineEmbed (pubId)')
  const doc = useEntity(props)
  const navigate = useNavigate()
  return (
    <InlineEmbedButton
      dataRef={props?.id}
      onPress={() =>
        navigate({
          key: 'document',
          documentId: pubId,
          versionId: props?.version || undefined,
        })
      }
    >
      {getDocumentTitle(doc.data?.document)}
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
