import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {StatementTools} from '../statement-tools'
import {statementStyle} from './statement'
import {
  isHeading,
  isStaticParagraph,
  // isFlowContent,
  // isStatement,
} from '@mintter/mttast'
import {Editor, Element, Node, Transforms} from 'slate'
import {
  isFirstChild,
  resetFlowContent,
  // isCollapsed
} from '../utils'
import {staticParagraph} from '@mintter/mttast-builder'

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
  renderElement({attributes, children, element}) {
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
    const {normalizeNode, deleteBackward, insertBreak} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      // const {selection} = editor
      // if (selection && isCollapsed(selection)) {
      //   const block = Editor.above(editor, {
      //     match: (n) => isFlowContent(n) && !isStatement(n),
      //   })

      //   if (block) {
      //     const [node, path] = block

      //     if (!Node.string(node.children[0])) {
      //     } else {
      //       // return
      //     }
      //   }
      // }
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
