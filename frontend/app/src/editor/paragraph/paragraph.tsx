import {FlowContent, isBlockquote, isCode, isEmbed, isParagraph, isPhrasingContent} from '@mintter/mttast'
import {Element, Node, Path, Transforms} from 'slate'
import {RenderElementProps, useSlateStatic} from 'slate-react'
import {visit} from 'unist-util-visit'
import {useHover} from '../hover-context'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {findPath} from '../utils'
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
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isParagraph(node)) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child) && !isPhrasingContent(child)) {
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
  const path = findPath(element)
  const parentNode = Node.parent(editor, path)
  const hoverService = useHover()

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
      css={{
        display: mode == EditorMode.Embed ? 'inline' : 'inherit',
      }}
      // style={{paddingLeft: isBlockquote(parentNode) ? '24px' : '0'}}
      data-parent-type={(parentNode as FlowContent)?.type}
      onMouseEnter={() =>
        hoverService.send({
          type: 'MOUSE_ENTER',
          blockId: (parentNode as FlowContent).id,
        })
      }
      {...attributes}
    >
      {children}
    </ParagraphUI>
  )
}

function hasEmbed(element: Element) {
  let value = false
  visit(element, isEmbed, (node) => {
    value = true
  })

  return value
}
