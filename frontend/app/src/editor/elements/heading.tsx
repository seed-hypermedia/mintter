import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {StatementTools} from '../statement-tools'
import {statementStyle} from './statement'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {Editor, Element, Node, Transforms} from 'slate'
import {isFirstChild, turnIntoDefaultFlowContent} from '../utils'
import {staticParagraph} from '@mintter/mttast-builder'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', statementStyle)

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    // TODO: compute heading level
    if (element.type === ELEMENT_HEADING) {
      return (
        <Heading {...attributes}>
          <StatementTools element={element} />
          {children}
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
    const {normalizeNode, deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (turnIntoDefaultFlowContent(editor)) return
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
