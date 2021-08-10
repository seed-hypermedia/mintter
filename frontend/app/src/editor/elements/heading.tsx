import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {Icon} from '@mintter/ui/icon'
import type {EditorPlugin} from '../types'
import {Dragger, Tools} from './statement'
import {Box} from '@mintter/ui/box'
import {Marker} from '../marker'
import {Ancestor, BaseEditor, BaseSelection, NodeEntry, Transforms} from 'slate'
import {Editor, Path} from 'slate'
import {Blockquote, Heading as HeadingType, isFlowContent, Parent, Statement} from '@mintter/mttast'
import type {ReactEditor} from 'slate-react'
import {createStatement, isCollapsed} from '../utils'
import {group, paragraph, statement, text} from 'frontend/mttast-builder/dist'
import {ELEMENT_PARAGRAPH} from './paragraph'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', {
  marginTop: '$7',
  padding: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  listStyle: 'none',
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    // TODO: compute heading level
    if (element.type === ELEMENT_HEADING) {
      return (
        <Heading {...attributes}>
          <Tools contentEditable={false}>
            <Dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
          <Box
            css={{
              flex: 1,
              '& > p': {
                fontWeight: '$bold',
              },
            }}
          >
            {children}
          </Box>
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
    /**
     * TODO: override insertBreak
     * - if Start: ???
     * - if End:
     *  - create a group
     *  - create a statement
     *  - select child statement
     * - if Middle:
     *  - break static paragraph
     *  - move text into new paragraph
     *  - wrap paragraph in a statement
     *  - wrap statement in a group (should be in the correct position: second child of heading)
     *
     */
    const {insertBreak} = editor
    editor.insertBreak = () => {
      const {selection} = editor
      if (isCollapsed(selection)) {
        const parentEntry = getFlowContentParent(editor, selection, ELEMENT_HEADING)
        console.log('🚀 ~ file: heading.tsx ~ line 74 ~ parentEntry', parentEntry)
        if (parentEntry) {
          const {isStart, isEnd, parent} = parentEntry
          const [pNode, pPath] = parent

          // check if there's a group child
          const hasChildrenGrouping = pNode.children.length == 2

          if (isEnd) {
            Editor.withoutNormalizing(editor, () => {
              if (hasChildrenGrouping) {
                // create a statement as first child of the current group
                Transforms.insertNodes(editor, createStatement(), {
                  at: [...pPath, 1, 0],
                })
              } else {
                // create a new group below the current heading
                Transforms.insertNodes(editor, group([createStatement()]), {
                  at: [...pPath, 1],
                })
              }
              Transforms.select(editor, [...pPath, 1, 0])
            })

            return
          }

          if (isStart) {
            // create statement at same path. the same as in the statement plugin!
            Editor.withoutNormalizing(editor, () => {
              Transforms.insertNodes(editor, createStatement(), {at: pPath})
              Transforms.select(editor, Editor.start(editor, Editor.start(editor, Path.next(pPath))))
            })
            return
          }

          // the selection is in the middle of a heading
          Editor.withoutNormalizing(editor, () => {
            Transforms.splitNodes(editor)
            const newParagraphPath = [...pPath, 1]
            Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: newParagraphPath})

            if (hasChildrenGrouping) {
              //   // the heading already has a child group, the new statement should be the first child of it
              Transforms.wrapNodes(editor, statement([]), {at: newParagraphPath})
              Transforms.moveNodes(editor, {at: newParagraphPath, to: [...pPath, 2, 0]})
            } else {
              //   Transforms.wrapNodes(editor, group([statement([])]), {at: newParagraphPath})
              Transforms.wrapNodes(editor, group([statement([])]), {at: newParagraphPath})
            }
          })

          return
        }
      }
      insertBreak()
    }

    return editor
  },
})
type GetParentResult<T = Ancestor> = {
  isStart: boolean
  isEnd: boolean
  parent: NodeEntry<T>
}
function getFlowContentParent<T = Statement | HeadingType | Blockquote>(
  editor: BaseEditor & ReactEditor,
  selection: BaseSelection,
  parentType: 'heading' | 'statement' | 'blockquote' | undefined,
): GetParentResult<T> | undefined {
  const type = parentType ?? 'statement'
  console.log('🚀 ~ file: heading.tsx ~ line 95 ~ type', type)
  const parent: NodeEntry<T> = Editor.above(editor, {
    match: (n) => isFlowContent(n),
  })

  if (!parent) return

  const [node, path] = parent

  if (node.type != parentType) return

  const isStart = Editor.isStart(editor, selection.focus, [...path, 0])
  const isEnd = Editor.isEnd(editor, selection.focus, [...path, 0])
  console.log({selection, end: Editor.end(editor, path)})

  return {
    isStart,
    isEnd,
    parent,
  }
}
