import { useAppContext } from '@/app-context'
import { useGatewayUrlStream } from '@/models/gateway-settings'
import { fetchWebLink } from '@/models/web-links'
import { useOpenUrl } from '@/open-url'
import { usePopoverState } from '@/use-popover-state'
import {
  BlockContentEmbed,
  createHmDocLink,
  hmIdWithVersion,
  isHypermediaScheme,
  isPublicGatewayLink,
  normalizeHmId,
  unpackHmId,
  useHover,
} from '@shm/shared'
import { ErrorBlock } from '@shm/shared/src/document-content'
import {
  Button,
  Check,
  ChevronDown,
  Forward as ChevronRight,
  ExternalLink,
  ListItem,
  MenuItem,
  MoreHorizontal,
  Popover,
  Separator,
  Tooltip,
  XStack,
  YGroup,
} from '@shm/ui'
import { Fragment } from '@tiptap/pm/model'
import { useCallback, useMemo } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Block, BlockNoteEditor, HMBlockSchema } from '.'
import { createReactBlockSpec } from './blocknote/react'
import { MediaContainer } from './media-container'
import { DisplayComponentProps, MediaRender, MediaType } from './media-render'

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

  parseHTML: [
    {
      tag: 'div[data-content-type=embed]',
      priority: 1000,
      getContent: (_node, _schema) => {
        return Fragment.empty
      },
    },
  ],
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const { queryClient } = useAppContext()
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
      assign({ props: { url: newUrl } } as MediaType)
      const cursorPosition = editor.getTextCursorPosition()
      editor.focus()
      if (cursorPosition.block.id === block.id) {
        if (cursorPosition.nextBlock)
          editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
        else {
          editor.insertBlocks(
            [{ type: 'paragraph', content: '' }],
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
            assign({ props: { url: fullHmId } } as MediaType)
            const cursorPosition = editor.getTextCursorPosition()
            editor.focus()
            if (cursorPosition.block.id === block.id) {
              if (cursorPosition.nextBlock)
                editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
              else {
                editor.insertBlocks(
                  [{ type: 'paragraph', content: '' }],
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
  const allowViewSwitcher = hmId?.type != 'c' && !hmId?.blockRef
  const allowVersionSwitcher = hmId?.type == 'd'
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
      assign({ props: { view } })
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
      $group-item-hover={{ opacity: 1 }}
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
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
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
