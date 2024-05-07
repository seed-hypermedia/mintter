import {useAppContext} from '@mintter/app/app-context'
import {useGatewayUrlStream} from '@mintter/app/models/gateway-settings'
import {useRecents} from '@mintter/app/models/recents'
import {useSearch} from '@mintter/app/models/search'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {useOpenUrl} from '@mintter/app/open-url'
import {
  BlockContentEmbed,
  HYPERMEDIA_ENTITY_TYPES,
  createHmDocLink,
  createHmId,
  hmIdWithVersion,
  isHypermediaScheme,
  isPublicGatewayLink,
  normalizeHmId,
  unpackHmId,
  useHover,
} from '@mintter/shared'
import {ErrorBlock} from '@mintter/shared/src/publication-content'
import {
  Button,
  Check,
  ChevronDown,
  Forward as ChevronRight,
  ExternalLink,
  Input,
  ListItem,
  MenuItem,
  MoreHorizontal,
  Popover,
  Separator,
  SizableText,
  Tooltip,
  XStack,
  YGroup,
  YStack,
} from '@mintter/ui'
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Block, BlockNoteEditor, HMBlockSchema} from '.'
import {createReactBlockSpec} from './blocknote/react'
import {MediaContainer} from './media-container'
import {DisplayComponentProps, MediaRender, MediaType} from './media-render'
import {usePopoverState} from './use-popover-state'

function EmbedError() {
  return <ErrorBlock message="Failed to load this Embedded document" />
}

export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    url: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'false',
    },
    view: {
      values: ['content', 'card'], // TODO: convert HMEmbedDisplay type to array items
      default: 'content',
    },
  },
  containsInlineContent: true,

  render: ({
    block,
    editor,
  }: {
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
  }) => Render(block, editor),
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const {queryClient} = useAppContext()
  const gwUrl = useGatewayUrlStream()
  const submitEmbed = async (
    url: string,
    assign: any,
    setFileName: any,
    setLoading: any,
  ) => {
    if (isPublicGatewayLink(url, gwUrl) || isHypermediaScheme(url)) {
      const hmLink = normalizeHmId(url, gwUrl)
      const newUrl = hmLink ? hmLink : url
      console.log(hmLink, newUrl)
      assign({props: {url: newUrl}} as MediaType)
      const cursorPosition = editor.getTextCursorPosition()
      editor.focus()
      if (cursorPosition.block.id === block.id) {
        if (cursorPosition.nextBlock)
          editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
        else {
          editor.insertBlocks(
            [{type: 'paragraph', content: ''}],
            block.id,
            'after',
          )
          editor.setTextCursorPosition(
            editor.getTextCursorPosition().nextBlock!,
            'start',
          )
        }
      }
    } else {
      setLoading(true)
      fetchWebLink(queryClient, url)
        .then((res) => {
          const fullHmId = hmIdWithVersion(
            res?.hmId,
            res?.hmVersion,
            res?.blockRef,
          )
          if (fullHmId) {
            console.log(fullHmId)
            assign({props: {url: fullHmId}} as MediaType)
            const cursorPosition = editor.getTextCursorPosition()
            editor.focus()
            if (cursorPosition.block.id === block.id) {
              if (cursorPosition.nextBlock)
                editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
              else {
                editor.insertBlocks(
                  [{type: 'paragraph', content: ''}],
                  block.id,
                  'after',
                )
                editor.setTextCursorPosition(
                  editor.getTextCursorPosition().nextBlock!,
                  'start',
                )
              }
            }
          } else {
            setFileName({
              name: 'The provided url is not a hypermedia link',
              color: 'red',
            })
          }
          setLoading(false)
        })
        .catch((e) => {
          setFileName({
            name: 'The provided url is not a hypermedia link',
            color: 'red',
          })
          setLoading(false)
        })
    }
  }
  return (
    <MediaRender
      block={block}
      editor={editor}
      mediaType="embed"
      CustomInput={EmbedLauncherInput}
      submit={submitEmbed}
      DisplayComponent={display}
      icon={<ExternalLink />}
    />
  )
}

const display = ({
  editor,
  block,
  assign,
  selected,
  setSelected,
}: DisplayComponentProps) => {
  const unpackedId = unpackHmId(block.props.url)
  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="embed"
      selected={selected}
      setSelected={setSelected}
      assign={assign}
    >
      <EmbedControl block={block} assign={assign} />
      {block.props.url && (
        <ErrorBoundary FallbackComponent={EmbedError}>
          <BlockContentEmbed
            expanded={
              unpackedId &&
              unpackedId.blockRange &&
              'expanded' in unpackedId.blockRange
                ? true
                : false
            }
            block={{
              id: block.id,
              type: 'embed',
              text: ' ',
              attributes: {
                childrenType: 'group',
                view: block.props.view,
              },
              annotations: [],
              ref: block.props.url,
            }}
            depth={1}
          />
        </ErrorBoundary>
      )}
    </MediaContainer>
  )
}

function EmbedControl({
  block,
  assign,
}: {
  block: Block<HMBlockSchema>
  assign: any
}) {
  const hmId = useMemo(() => {
    if (block.props.url) {
      return unpackHmId(block.props.url)
    }
    return null
  }, [block.props.url])
  const allowViewSwitcher = hmId?.type != 'c' && !hmId.blockRef
  const allowVersionSwitcher =
    hmId?.type == 'd' || (hmId?.type == 'g' && block.props.view == 'content')
  const openUrl = useOpenUrl()
  const popoverState = usePopoverState()
  const popoverViewState = usePopoverState()
  const popoverLatestState = usePopoverState()
  const popoverToDocumentState = usePopoverState()
  const expandButtonHover = useHover()

  let versionValue =
    block.props.url.includes('&l') || block.props.url.includes('?l')
      ? 'latest'
      : 'exact'
  let isVersionLatest = versionValue == 'latest'

  const handleViewSelect = useCallback((view: 'content' | 'card') => {
    return () => {
      assign({props: {view}})
      popoverViewState.onOpenChange(false)
    }
  }, [])

  const expanded = useMemo(() => {
    let res =
      hmId &&
      hmId?.blockRef &&
      hmId.blockRange &&
      'expanded' in hmId.blockRange &&
      hmId.blockRange?.expanded
    return res
  }, [block.props.url])

  const handleVersionSelect = useCallback(
    (versionMode: 'exact' | 'latest') => {
      let unpackedRef = unpackHmId(block.props.url)
      return () => {
        popoverLatestState.onOpenChange(false)
        if (unpackedRef) {
          assign({
            props: {
              url: createHmDocLink({
                documentId: unpackedRef?.qid,
                version: unpackedRef?.version,
                blockRef: unpackedRef?.blockRef,
                variants: unpackedRef?.variants,
                latest: versionMode === 'latest',
              }),
            },
          })
        }
      }
    },
    [block.props.url],
  )

  const handleBlockToDocument = useCallback(() => {
    let unpackedRef = unpackHmId(block.props.url)

    if (unpackedRef) {
      assign({
        props: {
          url: createHmDocLink({
            documentId: unpackedRef?.qid,
            version: unpackedRef?.version,
            blockRef: unpackedRef?.blockRef,
            variants: unpackedRef?.variants,
            latest: unpackedRef?.latest || undefined,
          }),
          view: 'content',
        },
      })
    }
  }, [block.props.url])

  return (
    <XStack
      position="absolute"
      x={0}
      y={0}
      zIndex="$zIndex.5"
      width="100%"
      ai="center"
      jc="flex-end"
      opacity={popoverState.open ? 1 : 0}
      padding="$2"
      gap="$2"
      $group-item-hover={{opacity: 1}}
    >
      <Tooltip content="Open in a new window">
        <Button
          size="$2"
          icon={<ExternalLink />}
          backgroundColor="$backgroundStrong"
          onPress={() => {
            openUrl(block.props.url, true)
          }}
        />
      </Tooltip>
      {hmId?.blockRef ? (
        <Tooltip
          content={
            expanded
              ? `Embed only the block's content`
              : `Embed the block and its children`
          }
        >
          <Button
            {...expandButtonHover}
            size="$2"
            icon={
              expanded
                ? expandButtonHover.hover
                  ? ChevronRight
                  : ChevronDown
                : expandButtonHover.hover
                ? ChevronDown
                : ChevronRight
            }
            backgroundColor="$backgroundStrong"
            onPress={(e) => {
              e.stopPropagation()
              let url = createHmDocLink({
                documentId: hmId?.qid,
                version: hmId?.version,
                variants: hmId?.variants,
                latest: !!hmId?.latest,
                blockRef: hmId?.blockRef,
                blockRange: {
                  expanded: !expanded,
                },
              })

              assign({
                props: {
                  url,
                  view: 'content',
                },
              })
            }}
          >
            {expanded
              ? expandButtonHover.hover
                ? 'Collapse'
                : 'Expand'
              : expandButtonHover.hover
              ? 'Expand'
              : 'Collapse'}
          </Button>
        </Tooltip>
      ) : null}

      {allowViewSwitcher && (
        <Popover
          {...popoverViewState}
          onOpenChange={(open) => {
            popoverState.onOpenChange(open)
            popoverViewState.onOpenChange(open)
          }}
          placement="bottom-end"
        >
          <Popover.Trigger asChild>
            <Button
              backgroundColor="$backgroundStrong"
              size="$2"
              iconAfter={ChevronDown}
            >{`view: ${block.props.view}`}</Button>
          </Popover.Trigger>
          <Popover.Content asChild>
            <YGroup padding={0} width={120}>
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="as Content"
                  onPress={handleViewSelect('content')}
                  iconAfter={block.props.view == 'content' ? Check : null}
                  hoverStyle={{
                    cursor: 'pointer',
                    bg: '$backgroundHover',
                  }}
                />
              </YGroup.Item>
              <Separator />
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="as Card"
                  onPress={handleViewSelect('card')}
                  iconAfter={block.props.view == 'card' ? Check : null}
                  hoverStyle={{
                    cursor: 'pointer',
                    bg: '$backgroundHover',
                  }}
                />
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
      )}
      {allowVersionSwitcher && (
        <Popover
          {...popoverLatestState}
          onOpenChange={(open) => {
            popoverState.onOpenChange(open)
            popoverLatestState.onOpenChange(open)
          }}
          placement="bottom-end"
        >
          <Popover.Trigger asChild>
            <Button
              backgroundColor="$backgroundStrong"
              size="$2"
              iconAfter={ChevronDown}
            >{`version: ${versionValue}`}</Button>
          </Popover.Trigger>
          <Popover.Content asChild>
            <YGroup padding={0} width={120} elevation="$4">
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="Latest"
                  onPress={handleVersionSelect('latest')}
                  iconAfter={isVersionLatest ? Check : null}
                  hoverStyle={{
                    cursor: 'pointer',
                    bg: '$backgroundHover',
                  }}
                />
              </YGroup.Item>
              <Separator />
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="Exact"
                  onPress={handleVersionSelect('exact')}
                  iconAfter={!isVersionLatest ? Check : null}
                  hoverStyle={{
                    cursor: 'pointer',
                    bg: '$backgroundHover',
                  }}
                />
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
      )}
      {hmId?.blockRef ? (
        <Popover {...popoverToDocumentState} placement="bottom-start">
          <Popover.Trigger asChild>
            <Button
              icon={MoreHorizontal}
              size="$1"
              onPress={(e) => e.stopPropagation()}
              circular
            />
          </Popover.Trigger>
          <Popover.Content
            padding={0}
            elevation="$2"
            animation={[
              'fast',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{y: -10, opacity: 0}}
            exitStyle={{y: -10, opacity: 0}}
            elevate={true}
          >
            <YGroup>
              <YGroup.Item>
                {hmId?.blockRef ? (
                  <MenuItem
                    onPress={(e) => {
                      e.stopPropagation()
                      handleBlockToDocument()
                    }}
                    title="Convert to Document Embed"
                    // icon={item.icon}
                  />
                ) : null}
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
      ) : null}
    </XStack>
  )
}

type SwitcherItem = {
  key: string
  title: string
  subtitle?: string
  onSelect: () => void
}

const EmbedLauncherInput = ({
  assign,
  setUrl,
  fileName,
  setFileName,
}: {
  assign: any
  setUrl: any
  fileName: any
  setFileName: any
}) => {
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const recents = useRecents()
  const searchResults = useSearch(search, {})

  const searchItems: SwitcherItem[] =
    searchResults.data
      ?.map((item) => {
        const id = unpackHmId(item.id)
        if (!id) return null
        return {
          title: item.title || item.id,
          onSelect: () => {
            const normalizedHmUrl = createHmId(id.type, id.eid, {
              blockRef: id.blockRef,
              blockRange: id.blockRange,
              version: id.version,
            })
            assign({props: {url: normalizedHmUrl}} as MediaType)
          },
          subtitle: HYPERMEDIA_ENTITY_TYPES[id.type],
        }
      })
      .filter(Boolean) || []
  const recentItems =
    recents.data?.map(({url, title, subtitle, type, variants}) => {
      return {
        key: url,
        title,
        subtitle,
        onSelect: () => {
          const id = unpackHmId(url)
          if (!id) {
            toast.error('Failed to open recent: ' + url)
            return
          }
          const normalizedHmUrl = createHmId(id.type, id.eid, {
            blockRef: id.blockRef,
            blockRange: id.blockRange,
            version: id.version,
          })
          assign({props: {url: normalizedHmUrl}} as MediaType)
        },
      }
    }) || []
  const isDisplayingRecents = !search.length
  const activeItems = isDisplayingRecents ? recentItems : searchItems

  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    if (focusedIndex >= activeItems.length) setFocusedIndex(0)
  }, [focusedIndex, activeItems])

  useEffect(() => {
    const keyPressHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        return
      }
      if (e.key === 'Enter') {
        const item = activeItems[focusedIndex]
        if (item) {
          item.onSelect()
        }
      }
      if (e.key === 'ArrowDown') {
        setFocusedIndex((prev) => (prev + 1) % activeItems.length)
      }
      if (e.key === 'ArrowUp') {
        setFocusedIndex(
          (prev) => (prev - 1 + activeItems.length) % activeItems.length,
        )
      }
    }
    window.addEventListener('keydown', keyPressHandler)
    return () => {
      window.removeEventListener('keydown', keyPressHandler)
    }
  }, [])

  let content = (
    // <Popover.Content>
    <YStack
      gap="$2"
      elevation={2}
      opacity={1}
      paddingVertical="$3"
      paddingHorizontal="$3"
      backgroundColor={'$backgroundHover'}
      borderTopStartRadius={0}
      borderTopEndRadius={0}
      borderBottomLeftRadius={6}
      borderBottomRightRadius={6}
      position="absolute"
      width="80%"
      top={fileName.color ? '$11' : '$8'}
      left={0}
      zIndex={999}
    >
      {isDisplayingRecents ? (
        <SizableText color="$color10" marginHorizontal="$4">
          Recent Resources
        </SizableText>
      ) : null}
      {activeItems?.map((item, itemIndex) => {
        return (
          <LauncherItem
            item={item}
            key={item.key}
            selected={focusedIndex === itemIndex}
            onFocus={() => {
              setFocusedIndex(itemIndex)
            }}
            onMouseEnter={() => {
              setFocusedIndex(itemIndex)
            }}
          />
        )
      })}
    </YStack>
    // </Popover.Content>
  )

  // if (actionPromise) {
  //   content = (
  //     <YStack marginVertical="$4">
  //       <Spinner />
  //     </YStack>
  //   )
  // }
  return (
    // <Popover open={focused}>
    <>
      <Input
        unstyled
        borderColor="$color8"
        borderWidth="$1"
        borderRadius="$2"
        paddingLeft="$3"
        height="$3"
        width="100%"
        hoverStyle={{
          borderColor: '$color11',
        }}
        focusStyle={{
          borderColor: '$color11',
        }}
        onFocus={() => {
          setFocused(true)
          // popoverState.onOpenChange(true)
        }}
        onBlur={(e) => {
          setTimeout(() => {
            setFocused(false)
          }, 150)
        }}
        autoFocus={false}
        value={search}
        onChangeText={(text) => {
          setSearch(text)
          setUrl(text)
          if (fileName.color)
            setFileName({
              name: 'Upload File',
              color: undefined,
            })
        }}
        placeholder="Query or input Embed URL..."
        // disabled={!!actionPromise}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Escape') {
            return
          }
          if (e.nativeEvent.key === 'Enter') {
            const item = activeItems[focusedIndex]
            if (item) {
              item.onSelect()
            }
          }
          if (e.nativeEvent.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex((prev) => (prev + 1) % activeItems.length)
          }
          if (e.nativeEvent.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex(
              (prev) => (prev - 1 + activeItems.length) % activeItems.length,
            )
          }
        }}
      />
      {/* </YStack> */}

      {focused && content}
      {/* </Popover> */}
    </>
  )
}

function LauncherItem({item, selected = false, onFocus, onMouseEnter}) {
  const elm = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (selected) {
      elm.current?.scrollIntoView({block: 'nearest'})
    }
  }, [selected])

  return (
    <Button
      ref={elm}
      key={item.key}
      onPress={item.onSelect}
      backgroundColor={selected ? '$blue4' : undefined}
      hoverStyle={{
        backgroundColor: selected ? '$blue4' : undefined,
      }}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
    >
      <XStack f={1} justifyContent="space-between">
        <SizableText numberOfLines={1}>{item.title}</SizableText>

        <SizableText color="$color10">{item.subtitle}</SizableText>
      </XStack>
    </Button>
  )
}

const EmbedSideAnnotation = forwardRef<
  HTMLDivElement,
  {hmId: string; sidePos: 'bottom' | 'right'}
>(function EmbedSideAnnotation({hmId, sidePos}, ref) {
  const unpacked = unpackHmId(hmId)
  if (unpacked && unpacked.type != 'd') return null
  const pub = usePublication({
    id: unpacked?.qid,
    version: unpacked?.version || undefined,
  })
  const editors = useAccounts(pub.data?.document?.editors || [])

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
    </YStack>
  )
})
