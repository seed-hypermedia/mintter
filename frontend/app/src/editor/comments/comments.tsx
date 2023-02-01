import {EditorMode} from '@app/editor/plugin-utils'
import {EditorPlugin} from '@app/editor/types'
import {useContext} from 'react'
import {Range} from 'slate'
import {ReactEditor} from 'slate-react'

const MARK_CONVERSATIONS = 'conversations'

export function createCommentsPlugin(): EditorPlugin {
  return {
    name: MARK_CONVERSATIONS,
    apply: EditorMode.Publication,
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if ('conversations' in leaf && leaf.text) {
          return (
            <span
              style={{
                backgroundColor: 'var(--highlight-surface2)',
                borderBottom: '2px solid var(--highlight-surface2)',
              }}
              {...attributes}
            >
              {children}
            </span>
          )
        }
      },
    configureEditor(editor) {
      const {apply} = editor

      editor.apply = (op) => {
        console.log('🚀 ~ file: comments.tsx:66 ~ configureEditor ~ op', op)
        /**
         * In order to receive just one particular type of event in the editor (set_selection), we need to override the `apply` hook in the editor
         */
        if (op.type == 'set_selection') {
          // check if the new Selection is a Range or not. If it is, that generally says that the selection has no offset, which means is collapsed. It jumps from one Point to another.

          if (Range.isRange(op.newProperties)) {
            // we are just being 100% sure the selection is not collapsed before we really apply the operation into the editor.
            if (!Range.isCollapsed(op.newProperties)) {
              apply(op)
            } else {
              // here we are blurring the editor since we don't want to show the cursor (caret) in this mode. this is just a "selection mode".
              ReactEditor.blur(editor)
            }
          } else {
            // apply the operation for any `newProperties` that are not ranges (usually this is changing the offset of the selection)
            apply(op)
          }
        } else if (op.type == 'set_node') {
          if (
            'conversations' in op.newProperties ||
            'conversations' in op.properties
          ) {
            apply(op)
          }
        } else if (op.type == 'split_node') {
          apply(op)
        } else {
          ReactEditor.blur(editor)
        }
      }
    },
    // onMouseUp(editor) {
    //   return (event) => {
    //     if (editor.selection && !Range.isCollapsed(editor.selection)) {
    //       let blocks = Editor.nodes(editor, {
    //         at: editor.selection,
    //         match: isFlowContent,
    //       })

    //       if (blocks) {
    //         console.log('BLOCKS', [...blocks])
    //         console.log('EDGES', Editor.edges(editor, editor.selection))
    //       }
    //     }
    //   }
    // },
  }
}
