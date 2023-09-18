import {PartialMessage} from '@bufbuild/protobuf'
import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  InlineContent,
} from './blocknote'
import {unpackHmIdWithAppRoute} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import type {
  BlockNode,
  HeadingBlock,
  ImageBlock,
  ParagraphBlock,
  PresentationBlock,
  Block as ServerBlock,
} from '@mintter/shared'
import {
  Block,
  EmbedBlock as EmbedBlockType,
  getCIDFromIPFSUrl,
  isHypermediaScheme,
  serverBlockToEditorInline,
  unpackDocId,
} from '@mintter/shared'
import {Spinner, Text, View, XStack, YStack, styled} from '@mintter/ui'
import {AlertCircle} from '@tamagui/lucide-icons'
import {ComponentProps, useEffect, useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {getBlockInfoFromPos} from './blocknote'
import {createReactBlockSpec} from './blocknote'
import {HMBlockSchema, hmBlockSchema} from './schema'
import {BACKEND_FILE_URL} from '@mintter/shared'
import {usePublication} from '@mintter/app/src/models/documents'
import {useOpenUrl} from '@mintter/app/src/open-url'

const EditorText = styled(Text, {
  fontSize: '$5',
  lineHeight: 1.5,
  fontFamily: '$body',
  // "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont,'Open Sans', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell','Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
})

function InlineContentView({
  inline,
  style,
}: {
  inline: InlineContent[]
  style?: ComponentProps<typeof EditorText>
}) {
  const openUrl = useOpenUrl()
  return (
    <>
      {inline.map((content, index) => {
        if (content.type === 'text') {
          let textDecorationLine:
            | 'underline'
            | 'none'
            | 'line-through'
            | 'underline line-through'
            | '' = ''
          if (content.styles.underline) {
            if (content.styles.strike) {
              textDecorationLine = 'underline line-through'
            } else {
              textDecorationLine = 'underline'
            }
          } else if (content.styles.strike) {
            textDecorationLine = 'line-through'
          }
          return (
            <EditorText
              {...style}
              key={`${content.type}-${index}`}
              fontWeight={content.styles.bold ? 'bold' : style?.fontWeight}
              textDecorationLine={textDecorationLine || undefined}
              // fontStyle={content.styles.italic ? 'italic' : undefined}
              fontFamily={content.styles.code ? '$mono' : '$body'}
            >
              {content.text}
            </EditorText>
          )
        }
        if (content.type === 'link') {
          return (
            <EditorText
              {...style}
              className={isHypermediaScheme(content.href) ? 'hm-link' : 'link'}
              key={index}
              onPress={() => {
                openUrl(content.href, true)
              }}
              color="$blue10"
              hoverStyle={{
                color: '$blue10',
                cursor: 'pointer',
              }}
            >
              <InlineContentView style={style} inline={content.content} />
            </EditorText>
          )
        }
        return null
      })}
    </>
  )
}

function StaticSectionBlock({block}: {block: HeadingBlock | ParagraphBlock}) {
  const inline = useMemo(
    () => serverBlockToEditorInline(new Block(block)),
    [block],
  )
  const style =
    block.type === 'heading' ? {fontSize: '$7', fontWeight: 'bold'} : undefined
  return (
    <View marginTop={12} marginBottom={3}>
      <InlineContentView inline={inline} style={style} />
    </View>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return (
    <img src={`${BACKEND_FILE_URL}/${cid}`} alt={`image block: ${block.id}`} />
  )
}

function StaticBlock({block}: {block: ServerBlock}) {
  // TODO: validation
  let niceBlock = block as PresentationBlock

  if (niceBlock.type === 'paragraph' || niceBlock.type === 'heading') {
    return <StaticSectionBlock block={niceBlock} />
  }
  if (niceBlock.type === 'image') {
    return <StaticImageBlock block={niceBlock} />
  }
  if (niceBlock.type === 'embed') {
    return <StaticEmbedPresentation block={niceBlock} />
  }
  if (niceBlock.type === 'code') {
    // @ts-expect-error
    return <StaticSectionBlock block={niceBlock} />
  }
  // fallback for unknown block types
  // return <span>{JSON.stringify(block)}</span>
  return <EditorText>mystery block 👻</EditorText>
}

function EmbedPresentation({
  block,
  editor,
}: {
  block: BlockNoteBlock<typeof hmBlockSchema>
  editor: BlockNoteEditor<typeof hmBlockSchema>
}) {
  let spawn = useNavigate('spawn')
  let embed = useEmbed(block.props.ref)
  let content = <Spinner />
  const selected = useSelected(block, editor)

  if (embed.content) {
    content = (
      <>
        {embed.content?.map((block) => (
          <StaticBlockNode key={block.block?.id} block={block} />
        ))}
      </>
    )
  }
  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      data-ref={block.props.ref}
      style={{userSelect: 'none'}}
      backgroundColor={selected ? '$color4' : '$color3'}
      borderColor={selected ? '$color8' : 'transparent'}
      borderWidth={2}
      borderRadius="$4"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
    >
      <YStack
        padding="$4"
        paddingVertical="$2"
        onPress={() => {
          if (editor?.isEditable) {
            return
          }
          const unpacked = unpackHmIdWithAppRoute(block.props.ref)
          if (unpacked?.navRoute && unpacked?.scheme === 'hm') {
            spawn(unpacked?.navRoute)
          }
        }}
      >
        {content}
      </YStack>
    </YStack>
  )
}

function StaticEmbedPresentation({block}: {block: EmbedBlockType}) {
  let embed = useEmbed(block.ref)
  let content = <Spinner />

  if (embed.content) {
    content = (
      <>
        {embed.content?.map((block) => (
          <StaticBlockNode key={block.block?.id} block={block} />
        ))}
      </>
    )
  }
  return (
    <YStack
      // @ts-expect-error
      contentEditable={false}
      data-ref={block.ref}
      style={{userSelect: 'none'}}
    >
      <YStack
        backgroundColor="$color5"
        borderColor="$color8"
        borderWidth={1}
        padding="$4"
        paddingVertical="$2"
        borderRadius="$4"
      >
        {content}
      </YStack>
    </YStack>
  )
}

function useSelected(
  block: BlockNoteBlock<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) {
  const [selected, setSelected] = useState(false)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

  useEffect(() => {
    if (editor) {
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
    }
  }, [selection])

  return selected
}

export function StaticBlockNode({block}: {block: BlockNode}) {
  const children =
    block.children.length > 0 ? (
      <YStack paddingLeft="$5">
        {block.children.map((child, index) => (
          <StaticBlockNode key={child.block?.id || index} block={child} />
        ))}
      </YStack>
    ) : null
  return (
    <YStack>
      {block.block && <StaticBlock block={block.block} />}
      {children}
    </YStack>
  )
}
function EmbedError() {
  return (
    <XStack
      backgroundColor="$red5"
      borderColor="$red8"
      borderWidth={1}
      padding="$4"
      paddingVertical="$2"
      borderRadius="$4"
      gap="$2"
    >
      <AlertCircle size={18} color="$red10" />
      <Text>Failed to load this Embedded document</Text>
    </XStack>
  )
}
export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,

  render: ({block, editor}) => {
    return (
      <ErrorBoundary FallbackComponent={EmbedError}>
        <EmbedPresentation block={block} editor={editor} />
      </ErrorBoundary>
    )
  },
})

function useEmbed(ref: string): ReturnType<typeof usePublication> & {
  content?: BlockNode[] & PartialMessage<BlockNode>[]
} {
  const pubId = unpackDocId(ref)
  let pubQuery = usePublication({
    documentId: pubId?.docId,
    versionId: pubId?.version,
    enabled: !!pubId?.docId,
  })

  return useMemo(() => {
    const data = pubQuery.data
    if (!data || !data.document) return pubQuery

    const selectedBlock = pubId?.blockRef
      ? getBlockNodeById(data.document.children, pubId?.blockRef)
      : null

    const embedBlocks = selectedBlock ? [selectedBlock] : data.document.children
    return {...pubQuery, content: embedBlocks}
  }, [pubQuery.data, pubId?.blockRef])
}

function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  if (!blockId) return null

  let res: BlockNode | undefined
  blocks.find((bn) => {
    if (bn.block?.id == blockId) {
      res = bn
      return true
    } else if (bn.children.length) {
      const foundChild = getBlockNodeById(bn.children, blockId)
      if (foundChild) {
        res = foundChild
        return true
      }
    }
    return false
  })
  return res || null
}
