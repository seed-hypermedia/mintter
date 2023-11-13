import {BlockSchema} from '../Blocks/api/blockTypes'
import {LinkMenuItem} from './LinkMenuItem'
import {BlockNoteEditor} from '../../BlockNoteEditor'
import {getBlockInfoFromPos} from '../Blocks/helpers/getBlockInfoFromPos'
import {Node} from '@tiptap/pm/model'

export const getDefaultLinkMenuItems = <BSchema extends BlockSchema>() => {
  const linkMenuItems: LinkMenuItem<BSchema>[] = [
    {
      name: 'Embed',
      execute: (editor: BlockNoteEditor<BSchema>, ref: string) => {
        const {state, schema, view} = editor._tiptapEditor
        const {doc, selection} = state
        if (!selection.empty) return
        const {$from, $to} = selection
        const block = getBlockInfoFromPos(doc, selection.$anchor.pos)
        if (!ref) {
          if (
            block.contentNode.content.lastChild?.marks[0].type.name === 'link'
          ) {
            ref = block.contentNode.content.lastChild.marks[0].attrs.href
          }
          if (!ref) {
            ref = block.contentNode.textContent
          }
        }
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
            $pos.pos - ref.length,
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
          tr = tr.replaceWith($from.before($from.depth), $to.pos, node)
        }
        view.dispatch(tr)

        const {block: currentBlock, nextBlock} = editor.getTextCursorPosition()

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
    },
    {
      name: 'Dismiss',
      execute: (editor: BlockNoteEditor<BSchema>, ref: string) => {},
    },
  ]

  return linkMenuItems
}
