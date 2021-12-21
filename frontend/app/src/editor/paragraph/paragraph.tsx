import {FlowContent, isBlockquote, isCode, isParagraph, isPhrasingContent} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Editor, Element, Node, Path, Transforms} from 'slate'
import {ReactEditor, RenderElementProps, useFocused, useSelected, useSlateStatic} from 'slate-react'
import {useHover} from '../hover-context'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'
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
      if (Element.isElement(node) && isParagraph(node)) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child) && !isPhrasingContent(child)) {
            console.log('is paragraph child and not phrasing: ', child, childPath)
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }
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
  const selected = useSelected()
  const focused = useFocused()

  let showPlaceholder =
    selected &&
    focused &&
    mode == EditorMode.Draft &&
    !Node.string(element) &&
    isCollapsed(editor.selection!) &&
    !hasEmbed(editor, element)

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
      style={{paddingLeft: isBlockquote(parentNode) ? '24px' : '0'}}
      data-parent-type={(parentNode as FlowContent)?.type}
      onMouseEnter={() => hoverSend({type: 'MOUSE_ENTER', blockId: (parentNode as FlowContent).id})}
      {...attributes}
    >
      {showPlaceholder && (
        <span
          contentEditable={false}
          style={{
            position: 'absolute',
            opacity: 0.4,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          Start typing here...
        </span>
      )}
      {children}
    </ParagraphUI>
  )
}

function hasEmbed(element: Element, path: Path) {
  return false
}
