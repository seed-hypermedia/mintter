import {HMBlock} from '@shm/shared'
import {Editor} from '@tiptap/react'
import {Node} from 'prosemirror-model'
import {BlockIdentifier, BlockNoteEditor} from '../editor'

export function getBlockGroup(
  editor: BlockNoteEditor,
  blockId: BlockIdentifier,
) {
  const tiptap = editor?._tiptapEditor
  if (tiptap) {
    const id = typeof blockId === 'string' ? blockId : blockId.id
    let group: {type: string; listLevel: string; start?: number} | undefined
    tiptap.state.doc.firstChild!.descendants((node: Node) => {
      if (typeof group !== 'undefined') {
        return false
      }

      if (node.attrs.id !== id) {
        return true
      }

      node.descendants((child: Node) => {
        if (child.attrs.listType && child.type.name === 'blockGroup') {
          group = {
            type: child.attrs.listType,
            start: child.attrs.start,
            listLevel: child.attrs.listLevel,
          } as const
          return false
        }
        return true
      })

      return true
    })
    return group
  }

  return undefined
}

export function setGroupTypes(tiptap: Editor, blocks: Array<Partial<HMBlock>>) {
  blocks.forEach((block: Partial<HMBlock>) => {
    tiptap.state.doc.descendants((node: Node, pos: number) => {
      if (
        node.attrs.id === block.id &&
        // @ts-expect-error
        block.props &&
        // @ts-expect-error
        block.props.childrenType
      ) {
        node.descendants((child: Node, childPos: number) => {
          if (child.type.name === 'blockGroup') {
            setTimeout(() => {
              let tr = tiptap.state.tr
              // @ts-expect-error
              tr = block.props?.start
                ? tr.setNodeMarkup(pos + childPos + 1, null, {
                    // @ts-expect-error
                    listType: block.props?.childrenType,
                    // @ts-expect-error
                    listLevel: block.props?.listLevel,
                    // @ts-expect-error
                    start: parseInt(block.props?.start),
                  })
                : tr.setNodeMarkup(pos + childPos + 1, null, {
                    // @ts-expect-error
                    listType: block.props?.childrenType,
                    // @ts-expect-error
                    listLevel: block.props?.listLevel,
                  })
              tiptap.view.dispatch(tr)
            })
            return false
          }
        })
      }
    })
    // @ts-expect-error
    if (block.children) {
      // @ts-expect-error
      setGroupTypes(tiptap, block.children)
    }
  })
}
