import {
  isHypermediaScheme,
  isPublicGatewayLink,
  normlizeHmId,
} from '@mintter/shared'
import {Spinner} from '@mintter/ui'
import {Node} from '@tiptap/pm/model'
import {BlockNoteEditor} from '../../BlockNoteEditor'
import {getBlockInfoFromPos} from '../Blocks/helpers/getBlockInfoFromPos'
import {LinkMenuItem} from './LinkMenuItem'

export function getLinkMenuItems(
  isLoading: boolean, // true is spinner needs to be shown
  isHmLink: boolean, // true if the link is an embeddable link
  media?: string, // type of media block if link points to a media file
  originalRef?: string, // the inserted link into the editor. needed to correctly replace the link with block
  fileName?: string, // file name if any
) {
  const linkMenuItems: LinkMenuItem[] = [
    {
      name: 'Dismiss',
      disabled: false,
      icon: undefined,
      execute: (editor: BlockNoteEditor, ref: string) => {},
    },
  ]

  if (isLoading) {
    const loadingItem = {
      name: 'Checking link...',
      icon: <Spinner size="small" />,
      disabled: true,
      execute: (editor, ref) => {},
    }

    linkMenuItems.unshift(loadingItem)
  } else {
    if (isHmLink) {
      const embedItem = {
        name: 'Embed',
        disabled: false,
        icon: undefined,
        execute: (editor: BlockNoteEditor, ref: string) => {
          if (isPublicGatewayLink(ref) || isHypermediaScheme(ref)) {
            const hmId = normlizeHmId(ref)
            if (!hmId) return
            ref = hmId
          }
          const {state, schema, view} = editor._tiptapEditor
          const {doc, selection} = state
          if (!selection.empty) return
          let tr = state.tr
          const node = schema.nodes.embed.create(
            {
              ref: ref,
            },
            schema.text(' '),
          )

          insertNode(editor, originalRef ? originalRef : ref, node)

          const {block: currentBlock, nextBlock} =
            editor.getTextCursorPosition()

          if (currentBlock.type === 'embed') {
            if (nextBlock) {
              editor.setTextCursorPosition(nextBlock, 'end')
            } else {
              editor.insertBlocks(
                [
                  {
                    type: 'paragraph',
                    content: [],
                  },
                ],
                currentBlock,
                'after',
              )
              editor.setTextCursorPosition(
                editor.getTextCursorPosition().nextBlock!,
                'end',
              )
            }
          } else {
            editor.setTextCursorPosition(
              getBlockInfoFromPos(doc, selection.$anchor.pos).id,
              'end',
            )
          }
        },
      }

      linkMenuItems.unshift(embedItem)
    } else if (media) {
      const mediaItem = {
        name: `Convert to ${media.charAt(0).toUpperCase() + media.slice(1)}`,
        disabled: false,
        icon: undefined,
        execute: (editor: BlockNoteEditor, ref: string) => {
          const {state, schema} = editor._tiptapEditor
          const {selection} = state
          if (!selection.empty) return
          const node = schema.nodes[media].create(
            media === 'video'
              ? {
                  url: ref,
                }
              : {src: ref, name: fileName},
          )
          insertNode(editor, originalRef ? originalRef : ref, node)
        },
      }

      linkMenuItems.unshift(mediaItem)
    }
  }

  return linkMenuItems
}

function insertNode(editor: BlockNoteEditor, ref: string, node: Node) {
  const {state, schema, view} = editor._tiptapEditor
  const {doc, selection} = state
  const {$from} = selection
  const block = getBlockInfoFromPos(doc, selection.$anchor.pos)
  let tr = state.tr

  // If inserted link inline with other text (child count will be more than 1)
  if (block.contentNode.content.childCount > 1) {
    const $pos = state.doc.resolve($from.pos)
    let originalStartContent = state.doc.cut(
      $pos.start(),
      $pos.pos - ref.length,
    )
    let originalLastContent = state.doc.cut($pos.pos, $pos.end())
    const originalContent: Node[] = []
    originalStartContent.descendants((childNode) => {
      if (childNode.type.name === 'text') originalContent.push(childNode)
    })
    originalLastContent.descendants((childNode) => {
      if (childNode.type.name === 'text') originalContent.push(childNode)
    })
    const originalNode = schema.node(
      block.contentType,
      block.contentNode.attrs,
      originalContent,
    )

    const newBlock = state.schema.nodes['blockContainer'].createAndFill()!
    const nextBlockPos = $pos.end() + 2
    const nextBlockContentPos = nextBlockPos + 2
    tr = tr.insert(nextBlockPos, newBlock)
    const $nextBlockPos = state.doc.resolve(nextBlockContentPos)
    tr = tr.replaceWith(
      $nextBlockPos.before($nextBlockPos.depth),
      nextBlockContentPos + 1,
      node,
    )
    tr = tr.replaceWith($pos.before($pos.depth), $pos.end(), originalNode)
  } else {
    tr = tr.replaceWith($from.before($from.depth), $from.pos, node)
  }
  view.dispatch(tr)
}
