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
  Form,
  Input,
  Popover,
  SizableText,
  Spinner,
  Tabs,
  Tooltip,
  XStack,
  YStack,
  useTheme,
} from '@mintter/ui'
import {useEffect, useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {RiArticleLine} from 'react-icons/ri'
import {Select} from 'tamagui'
import {Block, BlockNoteEditor, HMBlockSchema, getBlockInfoFromPos} from '.'
import {createReactBlockSpec} from './blocknote/react'
import {usePopoverState} from './use-popover-state'
type LinkType = null | 'basic' | 'hypermedia'

function EmbedError() {
  return <ErrorBlock message="Failed to load this Embedded document" />
}

export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    ref: {
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

type EmbedType = {
  id: string
  props: {
    ref: string
    display?: 'content' | 'card'
  }
  children: []
  content: []
  type: string
}

const boolRegex = new RegExp('true')

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const [selected, setSelected] = useState(false)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

  useEffect(() => {
    const selectedNode = getBlockInfoFromPos(
      tiptapEditor.state.doc,
      tiptapEditor.state.selection.from,
    )
    if (selectedNode && selectedNode.id) {
      if (
        selectedNode.id === block.id &&
        selectedNode.startPos === selection.$anchor.pos
      ) {
        setSelected(true)
      } else if (selectedNode.id !== block.id) {
        setSelected(false)
      }
    }
  }, [selection, editor, block.id, tiptapEditor])

  const assignEmbed = (newEmbed: EmbedType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newEmbed.props},
    })
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  return (
    <YStack
      backgroundColor={selected ? '$color4' : '$color3'}
      borderColor={selected ? '$color8' : 'transparent'}
      borderWidth={2}
      borderRadius="$4"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
    >
      {block.props.ref ? (
        <EmbedComponent
          block={block}
          editor={editor}
          assign={assignEmbed}
          selected={selected}
        />
      ) : editor.isEditable ? (
        <EmbedForm
          block={block}
          assign={assignEmbed}
          editor={editor}
          selected={selected}
        />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function EmbedComponent({
  block,
  editor,
  assign,
  selected,
}: {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  assign: any
  selected: boolean
}) {
  return (
    <YStack gap="$2" position="relative">
      <YStack
        backgroundColor={selected ? '$color4' : '$color3'}
        borderColor={selected ? '$color8' : 'transparent'}
        borderWidth={2}
        borderRadius="$2"
        overflow="hidden"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        // @ts-ignore
        contentEditable={false}
        className={block.type}
        group="item"
      >
        <EmbedControl block={block} assign={assign} />
        {block.props.ref && (
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
                ref: block.props.ref,
              }}
              depth={1}
            />
          </ErrorBoundary>
        )}
      </YStack>
    </YStack>
  )
}

function EmbedControl({
  block,
  assign,
}: {
  block: Block<HMBlockSchema>
  assign: any
}) {
  let isDocument = useMemo(() => {
    if (block.props.ref) {
      let unpackedRef = unpackHmId(block.props.ref)
      return unpackedRef?.type == 'd' && !unpackedRef?.blockRef
    }
    return false
  }, [block.props.ref])
  const openUrl = useOpenUrl()
  const popoverState = usePopoverState()
  const popoverViewState = usePopoverState()
  const popoverLatestState = usePopoverState()

  function addLatestParamToRef(currentRef: string) {
    let unpackedRef = unpackHmId(block.props.ref)

    let res = unpackedRef
      ? createHmDocLink({
          documentId: unpackedRef?.qid,
          version: unpackedRef?.version,
          blockRef: unpackedRef?.blockRef,
          latest: true,
        })
      : currentRef
    return res
  }
  function removeLatestParamToRef(currentRef: string) {
    let unpackedRef = unpackHmId(block.props.ref)

    let res = unpackedRef
      ? createHmDocLink({
          documentId: unpackedRef?.qid,
          version: unpackedRef?.version,
          blockRef: unpackedRef?.blockRef,
          latest: false,
        })
      : currentRef
    return res
  }

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
          iconAfter={<ExternalLink />}
          backgroundColor="$backgroundStrong"
          onPress={() => {
            openUrl(block.props.ref, true)
          }}
        />
      </Tooltip>
      {isDocument ? (
        <>
          <Select
            id="view"
            size="$2"
            value={block.props.view}
            onValueChange={(view) => {
              assign({props: {view}})
            }}
            {...popoverViewState}
            onOpenChange={(open) => {
              popoverState.onOpenChange(open)
              popoverViewState.onOpenChange(open)
            }}
            disablePreventBodyScroll
          >
            <Select.Trigger iconAfter={ChevronDown}>
              <Select.Value placeholder="Embed view" />
            </Select.Trigger>
            <Select.Content zIndex={200000}>
              <Select.Viewport disableScroll>
                <Select.Item index={1} value="content" gap="$2" minWidth={100}>
                  <Select.ItemText>Content</Select.ItemText>
                  <Select.ItemIndicator marginLeft="auto">
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item index={2} value="card" gap="$2" minWidth={100}>
                  <Select.ItemText>Card</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select>
          <Select
            id="version"
            size="$2"
            value={block.props.ref.includes('&l') ? 'latest' : 'exact'}
            {...popoverLatestState}
            onOpenChange={(open) => {
              popoverLatestState.onOpenChange(open)
              popoverState.onOpenChange(open)
            }}
            onValueChange={(value: 'latest' | 'exact') => {
              const newRef =
                value == 'latest'
                  ? addLatestParamToRef(block.props.ref)
                  : removeLatestParamToRef(block.props.ref)

              assign({props: {ref: newRef}})
            }}
            disablePreventBodyScroll
          >
            <Select.Trigger>
              <Select.Value placeholder="version" />
            </Select.Trigger>
            <Select.Content zIndex={200000}>
              <Select.Viewport disableScroll minWidth={120}>
                <Select.Item index={1} value="latest" gap="$2" minWidth={100}>
                  <Select.ItemText>Latest version</Select.ItemText>
                  <Select.ItemIndicator marginLeft="auto">
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
                <Select.Item index={2} value="exact" gap="$2" minWidth={100}>
                  <Select.ItemText>Exact version</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select>
        </>
      ) : null}
    </XStack>
  )
}

function EmbedForm({
  block,
  assign,
  selected = false,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
  selected: boolean
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [tabState, setTabState] = useState('embed')
  const [error, setError] = useState<{
    name: string
    color: string | undefined
  }>({
    name: '',
    color: undefined,
  })
  const theme = useTheme()
  const {queryClient} = useAppContext()
  const gwUrl = useGatewayUrlStream()
  function submitEmbed(url: string) {
    if (isPublicGatewayLink(url, gwUrl) || isHypermediaScheme(url)) {
      const hmLink = normlizeHmId(url, gwUrl)
      const ref = hmLink ? hmLink : url
      assign({props: {ref: ref}} as EmbedType)
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
            assign({props: {ref: fullHmId}} as EmbedType)
          } else {
            setError({
              name: 'The provided url is not a hypermedia link',
              color: 'red',
            })
          }
          setLoading(false)
        })
        .catch((e) => {
          setError({
            name: 'The provided url is not a hypermedia link',
            color: 'red',
          })
          setLoading(false)
        })
    }
  }

  return (
    <YStack
      //@ts-ignore
      contentEditable={false}
      position="relative"
      borderWidth={0}
      outlineWidth={0}
    >
      <Popover
        placement="bottom"
        size="$5"
        defaultOpen={boolRegex.test(block.props.defaultOpen)}
        stayInFrame
      >
        <Popover.Trigger asChild>
          <Button
            icon={<RiArticleLine fill={theme.color12.get()} />}
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
            backgroundColor="$color3"
            hoverStyle={{
              backgroundColor: '$color4',
            }}
          >
            Add an Embed
          </Button>
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$3"
          overflow="hidden"
          size="$5"
          borderRadius="$5"
          shadowColor="$shadowColor"
          opacity={1}
          enterStyle={{x: 0, y: -10, opacity: 0}}
          exitStyle={{x: 0, y: -10, opacity: 0}}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
        >
          <Tabs
            value={tabState}
            onValueChange={setTabState}
            orientation="horizontal"
            flexDirection="column"
            width={500}
            elevate
          >
            <Tabs.List
              marginBottom="$-0.5"
              backgroundColor="$background"
              borderBottomColor="$color8"
              borderBottomWidth="$1"
              borderBottomLeftRadius={0}
              borderBottomRightRadius={0}
              borderRadius={0}
            >
              <Tabs.Tab
                unstyled
                value="embed"
                paddingHorizontal="$4"
                paddingVertical="$2"
                borderBottomLeftRadius={0}
                borderBottomRightRadius={0}
                borderBottomWidth={'$1'}
                hoverStyle={{
                  backgroundColor: '$backgroundHover',
                  cursor: 'pointer',
                }}
              >
                <SizableText size="$2">Embed</SizableText>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Content value="embed">
              <XStack
                padding="$4"
                alignItems="center"
                backgroundColor="$background"
              >
                <Form
                  alignItems="center"
                  onSubmit={() => submitEmbed(url)}
                  borderWidth={0}
                >
                  <YStack flex={1}>
                    <XStack>
                      <Input
                        width={360}
                        marginRight="$3"
                        borderColor="$color8"
                        borderWidth="$0.5"
                        borderRadius="$3"
                        size="$3.5"
                        placeholder="Input embed link..."
                        focusStyle={{
                          borderColor: '$colorFocus',
                          outlineWidth: 0,
                        }}
                        hoverStyle={{
                          borderColor: '$colorFocus',
                          outlineWidth: 0,
                        }}
                        onChange={(e) => {
                          setUrl(e.nativeEvent.text)
                          if (error.color)
                            setError({
                              name: '',
                              color: undefined,
                            })
                        }}
                        autoFocus={true}
                      />
                      <Form.Trigger asChild>
                        <Button
                          flex={0}
                          flexShrink={0}
                          borderRadius="$3"
                          size="$3.5"
                          theme={error.color === 'red' ? 'gray' : 'green'}
                          disabled={error.color === 'red' ? true : false}
                          focusStyle={{
                            outlineWidth: 0,
                          }}
                        >
                          {loading ? (
                            <Spinner
                              size="small"
                              color="$green9"
                              paddingHorizontal="$3"
                            />
                          ) : (
                            'Embed'
                          )}
                        </Button>
                      </Form.Trigger>
                    </XStack>
                    {error.name && (
                      <SizableText
                        size="$2"
                        color={error.color}
                        paddingTop="$2"
                      >
                        {error.name}
                      </SizableText>
                    )}
                  </YStack>
                </Form>
              </XStack>
            </Tabs.Content>
          </Tabs>
        </Popover.Content>
      </Popover>
    </YStack>
  )
}
