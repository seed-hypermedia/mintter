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
  isLoading: boolean,
  isHmLink: boolean,
  originalRef?: string,
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
          const {$from} = selection
          const block = getBlockInfoFromPos(doc, selection.$anchor.pos)
          let tr = state.tr
          const textNode = schema.text(' ')
          const node = schema.nodes.embed.create(
            {
              ref: ref,
            },
            textNode,
          )

          if (block.contentNode.content.childCount > 1) {
            const $pos = state.doc.resolve($from.pos)
            let originalStartContent = state.doc.cut(
              $pos.start(),
              originalRef
                ? $pos.pos - originalRef.length
                : $pos.pos - ref.length,
            )
            let originalLastContent = state.doc.cut($pos.pos, $pos.end())
            const originalContent: Node[] = []
            originalStartContent.descendants((node) => {
              if (node.type.name === 'text') originalContent.push(node)
            })
            originalLastContent.descendants((node) => {
              if (node.type.name === 'text') originalContent.push(node)
            })
            const originalNode = schema.node(
              block.contentType,
              block.contentNode.attrs,
              originalContent,
            )

            const newBlock =
              state.schema.nodes['blockContainer'].createAndFill()!
            const nextBlockPos = $pos.end() + 2
            const nextBlockContentPos = nextBlockPos + 2
            tr = tr.insert(nextBlockPos, newBlock)
            const $nextBlockPos = state.doc.resolve(nextBlockContentPos)
            tr = tr.replaceWith(
              $nextBlockPos.before($nextBlockPos.depth),
              nextBlockContentPos + 1,
              node,
            )
            tr = tr.replaceWith(
              $pos.before($pos.depth),
              $pos.end(),
              originalNode,
            )
          } else {
            tr = tr.replaceWith($from.before($from.depth), $from.pos, node)
          }
          view.dispatch(tr)

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
            editor.setTextCursorPosition(block, 'end')
          }
        },
      }

      linkMenuItems.unshift(embedItem)
    }
  }

  return linkMenuItems
}
