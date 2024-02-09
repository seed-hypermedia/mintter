import {useAppContext} from '@mintter/app/app-context'
import {useGatewayUrlStream} from '@mintter/app/models/gateway-settings'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {useOpenUrl} from '@mintter/app/open-url'
import {
  BlockContentEmbed,
  createHmDocLink,
  extractBlockRefOfUrl,
  hmIdWithVersion,
  isHypermediaScheme,
  isPublicGatewayLink,
  normlizeHmId,
  unpackHmId,
} from '@mintter/shared'
import {ErrorBlock} from '@mintter/shared/src/publication-content'
import {
  Button,
  Check,
  ChevronDown,
  ExternalLink,
  Popover,
  Tooltip,
  XStack,
} from '@mintter/ui'
import {useCallback, useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {ListItem, Separator, YGroup} from 'tamagui'
import {Block, BlockNoteEditor, HMBlockSchema} from '.'
import {createReactBlockSpec} from './blocknote/react'
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
      const hmLink = normlizeHmId(url, gwUrl)
      const newUrl = hmLink ? hmLink : url
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
            extractBlockRefOfUrl(url),
          )
          if (fullHmId) {
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
      submit={submitEmbed}
      DisplayComponent={display}
      icon={<ExternalLink />}
    />
  )
}

const display = ({block, assign}: DisplayComponentProps) => {
  return (
    <>
      <EmbedControl block={block} assign={assign} />
      {block.props.url && (
        <ErrorBoundary FallbackComponent={EmbedError}>
          <BlockContentEmbed
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
    </>
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
  const allowViewSwitcher = hmId?.type === 'd' && !hmId.blockRef
  const allowVersionSwitcher = hmId?.type === 'd'
  const openUrl = useOpenUrl()
  const popoverState = usePopoverState()
  const popoverViewState = usePopoverState()
  const popoverLatestState = usePopoverState()

  let versionValue = block.props.url.includes('&l') ? 'latest' : 'exact'
  let isVersionLatest = versionValue == 'latest'

  const handleViewSelect = useCallback((view: 'content' | 'card') => {
    return () => {
      assign({props: {view}})
      popoverViewState.onOpenChange(false)
    }
  }, [])

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

  return (
    <XStack
      position="absolute"
      x={0}
      y={0}
      zIndex={100}
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
            <YGroup padding={0} width={120}>
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="Latest"
                  onPress={handleVersionSelect('latest')}
                  iconAfter={isVersionLatest ? Check : null}
                />
              </YGroup.Item>
              <Separator />
              <YGroup.Item>
                <ListItem
                  size="$2"
                  title="Exact"
                  onPress={handleVersionSelect('exact')}
                  iconAfter={!isVersionLatest ? Check : null}
                />
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
      )}
    </XStack>
  )
}
