import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  InlineContent,
} from '@mintter/app/src/blocknote-core'
import {PartialMessage} from '@bufbuild/protobuf'
import type {
  Block as ServerBlock,
  BlockNode,
  HeadingBlock,
  ImageBlock,
  ParagraphBlock,
  PresentationBlock,
} from '@mintter/shared'
import {
  Block,
  EmbedBlock as EmbedBlockType,
  getCIDFromIPFSUrl,
  getIdsfromUrl,
  isHyperdocsScheme,
  serverBlockToEditorInline,
} from '@mintter/shared'
import {Spinner, Text, YStack} from '@mintter/ui'
import {useEffect, useMemo, useState} from 'react'
import {getBlockInfoFromPos} from '../blocknote-core/extensions/Blocks/helpers/getBlockInfoFromPos'
import {createReactBlockSpec} from '../blocknote-react'
import {HDBlockSchema, hdBlockSchema} from '../client/schema'
import {usePublication} from '../models/documents'
import {useNavigate} from '@mintter/app/src/utils/navigation'
import {useOpenUrl} from '../open-url'
import {BACKEND_FILE_URL} from '../constants'

function InlineContentView({inline}: {inline: InlineContent[]}) {
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
            <Text
              key={`${content.type}-${index}`}
              fontWeight={content.styles.bold ? 'bold' : '100'}
              textDecorationLine={textDecorationLine || undefined}
              fontStyle={content.styles.italic ? 'italic' : undefined}
              // @ts-expect-error tamagui upgrade
              fontFamily={content.styles.code ? 'monospace' : undefined}
            >
              {content.text}
            </Text>
          )
        }
        if (content.type === 'link') {
          return (
            <span
              className={isHyperdocsScheme(content.href) ? 'hd-link' : 'link'}
              onClick={() => {
                openUrl(content.href, true)
              }}
              style={{cursor: 'pointer'}}
            >
              <InlineContentView inline={content.content} />
            </span>
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
  return (
    <span>
      <InlineContentView inline={inline} />
    </span>
  )
}

function StaticImageBlock({block}: {block: ImageBlock}) {
  const cid = getCIDFromIPFSUrl(block?.ref)
  if (!cid) return null
  return <img src={`${BACKEND_FILE_URL}/${cid}`} />
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
  return <span>mystery block 👻</span>
}

function EmbedPresentation({
  block,
  editor,
}: {
  block: BlockNoteBlock<typeof hdBlockSchema>
  editor?: BlockNoteEditor<typeof hdBlockSchema>
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
      className={selected ? 'ProseMirror-selectednode' : ''}
    >
      <YStack
        backgroundColor="$color5"
        borderColor="$color8"
        borderWidth={1}
        padding="$4"
        paddingVertical="$2"
        borderRadius="$4"
        onPress={() => {
          let [documentId, version, blockId] = getIdsfromUrl(block.props.ref)
          if (documentId) {
            spawn({key: 'publication', documentId, versionId: version, blockId})
          }
        }}
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$color6',
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
  block: BlockNoteBlock<HDBlockSchema>,
  editor?: BlockNoteEditor<HDBlockSchema>,
) {
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    if (editor) {
      const tiptapEditor = editor?._tiptapEditor
      const selection = tiptapEditor?.state.selection
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
  }, [editor?._tiptapEditor])

  return selected
}

function StaticBlockNode({block}: {block: BlockNode}) {
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

export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,

  render: ({block, editor}) => {
    // @ts-expect-error
    return <EmbedPresentation block={block} editor={editor} />
  },
})

function useEmbed(ref: string): ReturnType<typeof usePublication> & {
  content?: BlockNode[] & PartialMessage<BlockNode>[]
} {
  let [documentId, versionId, blockId] = getIdsfromUrl(ref)

  let pubQuery = usePublication({
    documentId,
    versionId,
    enabled: !!documentId,
  })

  return useMemo(() => {
    const data = pubQuery.data
    if (!data || !data.document) return pubQuery

    const selectedBlock = blockId
      ? getBlockNodeById(data.document.children, blockId)
      : null

    const embedBlocks = selectedBlock ? [selectedBlock] : data.document.children
    return {...pubQuery, content: embedBlocks}
  }, [pubQuery.data, blockId])
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
