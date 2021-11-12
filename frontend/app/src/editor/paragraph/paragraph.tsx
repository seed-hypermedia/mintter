import {FlowContent, isBlockquote, isCode, isParagraph} from '@mintter/mttast'
import {createId, statement} from '@mintter/mttast-builder'
import {useActor} from '@xstate/react'
import {Editor, Node, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useHover} from '../hover-context'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {ParagraphUI} from './paragraph-ui'

export const ELEMENT_PARAGRAPH = 'paragraph'

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isParagraph(element)) {
        return (
          <Paragraph mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Paragraph>
        )
      }
    },
  configureEditor: (editor) => {
    if (editor.mode) return
    const {normalizeNode, insertBreak} = editor

    editor.insertBreak = () => {
      insertBreak()
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (isParagraph(node)) {
        if (Path.hasPrevious(path)) {
          const [parentNode] = Editor.parent(editor, path)
          const prevNode = Node.get(editor, Path.previous(path))
          if (isCode(parentNode)) {
            return
          }
          /*
           * @todo if the selection is in the beginning, then wrap the first paragraph with a new statement
           * @body Issue Body
           */
          let id = createId()
          Editor.withoutNormalizing(editor, () => {
            let targetPath = Editor.isEmpty(editor, prevNode) ? Path.previous(path) : path
            Transforms.wrapNodes(editor, statement({id}), {
              at: targetPath,
            })
            Transforms.setNodes(editor, {id: createId()}, {at: targetPath})
          })

          return
        }
      }
      normalizeNode(entry)
    }

    return editor
  },
})

function Paragraph({children, element, attributes, mode}: RenderElementProps & {mode: EditorMode}) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const [parentNode] = Editor.parent(editor, path)
  const hoverService = useHover()
  const [, hoverSend] = useActor(hoverService)

  return (
    <ParagraphUI
      as={
        mode == EditorMode.Embed || mode == EditorMode.Mention
          ? 'span'
          : isCode(parentNode)
          ? 'span'
          : isBlockquote(parentNode)
          ? 'blockquote'
          : 'p'
      }
      data-element-type={element.type}
      css={{display: mode == EditorMode.Embed ? 'inline' : 'inherit'}}
      data-parent-type={(parentNode as FlowContent)?.type}
      onMouseEnter={() => hoverSend({type: 'MOUSE_ENTER', blockId: (parentNode as FlowContent).id})}
      {...attributes}
    >
      {children}
    </ParagraphUI>
  )
}
