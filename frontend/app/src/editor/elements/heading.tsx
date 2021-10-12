import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {staticParagraph} from '@mintter/mttast-builder'
import {styled} from '@mintter/ui/stitches.config'
import {Editor, Element, Node, Transforms} from 'slate'
import {StatementTools} from '../statement-tools'
import type {EditorPlugin} from '../types'
import {isFirstChild, resetFlowContent} from '../utils'
import {statementStyle} from './statement'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', statementStyle, {
  // gridTemplateAreas: `"controls content"
  // "children children"`,
  '& > ul, & > ol': {
    marginLeft: '-$8',
    boxShadow: 'none',
  },
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement:
    () =>
    ({attributes, children, element}) => {
      // TODO: compute heading level
      if (isHeading(element)) {
        return (
          <Heading {...attributes} data-element-type={element.type}>
            <StatementTools element={element} />
            {children}
          </Heading>
        )
      }
    },
  configureEditor: (editor) => {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (isHeading(node)) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child) && !editor.isInline(child)) {
            if (isFirstChild(childPath) && !isStaticParagraph(child)) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.removeNodes(editor, {at: childPath})
                Transforms.insertNodes(editor, staticParagraph(child.children), {at: childPath})
              })
              return
            }
          }
        }
      }
      normalizeNode(entry)
    }
    return editor
  },
})
