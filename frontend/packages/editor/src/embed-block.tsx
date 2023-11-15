import {
  useAppContext,
} from '@mintter/app/app-context'
import { fetchWebLink } from '@mintter/app/models/web-links'
import { usePopoverState } from '@mintter/app/use-popover-state'
import { BlockContentEmbed, extractBlockRefOfUrl, hmIdWithVersion, isHypermediaScheme, isPublicGatewayLink, normlizeHmId } from '@mintter/shared'
import { ErrorBlock } from '@mintter/shared/src/publication-content'
import {
  Button,
  Form,
  Input,
  SizableText,
  Spinner,
  Tabs,
  XStack,
  YStack,
  useTheme
} from '@mintter/ui'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { RiArticleLine } from 'react-icons/ri'
import { Block, BlockNoteEditor, HMBlockSchema, getBlockInfoFromPos } from '.'
import { createReactBlockSpec } from './blocknote/react'

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
  }
  children: []
  content: []
  type: string
}

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
  }, [selection])

  const assignEmbed = (newEmbed: EmbedType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newEmbed.props},
    })
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  return (
    <YStack>
      {block.props.ref ? (
        <EmbedComponent
          block={block}
          editor={editor}
          assign={assignEmbed}
          selected={selected}
          setSelected={setSelection}
        />
      ) : editor.isEditable ? (
        <EmbedForm block={block} assign={assignEmbed} editor={editor} />
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
  setSelected
}: {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  assign: any
  selected: boolean
  setSelected: any
}) {
  const [replace, setReplace] = useState(false)

  return (
    <YStack gap="$2">
      <YStack
        backgroundColor={selected ? '$color4' : '$color3'}
        borderColor={selected ? '$color8' : 'transparent'}
        borderWidth={2}
        borderRadius="$2"
        overflow="hidden"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        padding="$2"
        // @ts-ignore
        contentEditable={false}
        className={block.type}
        onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(true)
        }}
        onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(false)
        }}
      >
        {replace ? (
          <Button
            position="absolute"
            top="$1.5"
            right="$1.5"
            zIndex="$4"
            size="$1"
            width={60}
            onPress={() =>
              assign({
                props: {
                  ref: '',
                },
                children: [],
                content: [],
                type: 'embed',
              } as EmbedType)
            }
            hoverStyle={{
              backgroundColor: '$backgroundTransparent',
            }}
          >
            replace
          </Button>
        ) : (
          <></>
        )}
        {block.props.ref && (
          <ErrorBoundary FallbackComponent={EmbedError}>
            <BlockContentEmbed
              block={{
                id: block.id,
                type: 'embed',
                text: ' ',
                attributes: {
                  childrenType: 'group',
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

function EmbedForm({
  block,
  assign,
  editor,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
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
  const popoverState = usePopoverState()
  const {queryClient} = useAppContext()

  function submitEmbed(url: string) {
    if (isPublicGatewayLink(url) || isHypermediaScheme(url)) {
      const hmLink = normlizeHmId(url)
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
          }
          else {
            setError({
              name: 'The provided url is not a hypermedia link',
              color: 'red'
            })
          }
          setLoading(false)
        })
        .catch((e) => {
          setError({
            name: 'The provided url is not a hypermedia link',
            color: 'red'
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
      {popoverState.open ? (
        <XStack
          backgroundColor="transparent"
          fullscreen
          zIndex={9998}
          style={{position: 'fixed'}}
          onPress={() => popoverState.onOpenChange(false)}
        />
      ) : null}
      <Button
        icon={<RiArticleLine fill={theme.color12.get()} />}
        borderRadius={0}
        size="$5"
        justifyContent="flex-start"
        backgroundColor="$color3"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        onPress={() => popoverState.onOpenChange(!popoverState.open)}
      >
        Add an Embed
      </Button>

      {popoverState.open ? (
        <>
          <YStack
            position="absolute"
            zIndex={9999}
            padding={0}
            elevation="$3"
            overflow="hidden"
            borderRadius="$5"
            shadowColor="$shadowColor"
            opacity={1}
            left="50%"
            top={24}
            x="-50%"
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
                  <Form alignItems="center" onSubmit={() => submitEmbed(url)} borderWidth={0}>
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
                          onChange={(e) => {setUrl(e.nativeEvent.text); if (error.color) setError({
                            name: '',
                            color: undefined,
                          })}}
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
                              <Spinner size="small" color="$green9" paddingHorizontal="$3"/>
                            ) : "Embed"}
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
          </YStack>
        </>
      ) : null}
    </YStack>
  )
}

// function useEmbed(ref: string): {
//   isLoading: boolean
//   embedBlocks: (BlockNode[] & PartialMessage<BlockNode>[]) | undefined
//   group: Group | undefined
//   account: Account | undefined
// } {
//   const id = unpackHmId(ref)
//   const docId = id?.type === 'd' ? createHmId('d', id?.eid) : undefined
//   let pubQuery = usePublication({
//     documentId: docId,
//     versionId: id?.version || undefined,
//     enabled: !!docId,
//   })
//   const groupId = id?.type === 'g' ? createHmId('g', id?.eid) : undefined
//   const groupQuery = useGroup(groupId, id?.version || undefined)
//   const accountId = id?.type === 'a' ? id?.eid : undefined
//   const accountQuery = useAccount(accountId)
//   return useMemo(() => {
//     const data = pubQuery.data

//     const selectedBlock =
//       id?.blockRef && data?.document?.children
//         ? getBlockNodeById(data.document.children, id?.blockRef)
//         : null

//     const embedBlocks = selectedBlock
//       ? [selectedBlock]
//       : data?.document?.children

//     return {
//       isLoading:
//         pubQuery.isLoading || accountQuery.isLoading || groupQuery.isLoading,
//       error: pubQuery.error || accountQuery.error || groupQuery.error,
//       embedBlocks,
//       account: accountQuery.data,
//       group: groupQuery.data,
//     }
//   }, [pubQuery, accountQuery, groupQuery, id?.blockRef])
// }

// function getBlockNodeById(
//   blocks: Array<BlockNode>,
//   blockId: string,
// ): BlockNode | null {
//   if (!blockId) return null

//   let res: BlockNode | undefined
//   blocks.find((bn) => {
//     if (bn.block?.id == blockId) {
//       res = bn
//       return true
//     } else if (bn.children.length) {
//       const foundChild = getBlockNodeById(bn.children, blockId)
//       if (foundChild) {
//         res = foundChild
//         return true
//       }
//     }
//     return false
//   })
//   return res || null
// }
