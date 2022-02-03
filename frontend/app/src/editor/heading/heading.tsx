import {BlockWrapper} from '@app/editor/block-wrapper'
import {EditorMode} from '@app/editor/plugin-utils'
import {
  createId,
  Heading as HeadingType,
  isGroupContent,
  isHeading,
  isStaticParagraph,
  statement,
} from '@mintter/mttast'
import {Editor, Element, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {BlockTools} from '../block-tools'
import type {EditorPlugin} from '../types'
import {isFirstChild, resetFlowContent} from '../utils'
import {HeadingUI} from './heading-ui'

export const ELEMENT_HEADING = 'heading'

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isHeading(element)) {
        return (
          <Heading mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Heading>
        )
      }
    },
  configureEditor: (editor) => {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward, insertBreak} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isHeading(node)) {
        if (removeEmptyHeading(editor, entry as NodeEntry<HeadingType>)) return

        if (isFirstChild(path.concat(0)) && !isStaticParagraph(node.children[0])) {
          // transform to static paragraph if there's only one child and is not static paragraph
          Transforms.setNodes(editor, {type: 'staticParagraph'}, {at: path.concat(0)})
          return
        } else if (node.children.length > 2) {
          let secondChild = node.children[1]
          console.log('==== segundo heading child: ', node.children[1])
          if (isStaticParagraph(secondChild)) {
            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              Transforms.moveNodes(editor, {at, to: path.concat(2, 0)})
              return
            })
          }
        } else if (node.children.length == 2) {
          if (!isGroupContent(node.children[1])) {
            // move second static paragraph outside if the second node is not a group
            let pGroupEntry = Editor.above(editor, {at: path.concat(1), match: isGroupContent})

            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              Transforms.setNodes(editor, {type: 'paragraph'}, {at})
              Transforms.wrapNodes(editor, statement({id: createId()}), {at})
              Transforms.wrapNodes(editor, {type: pGroupEntry ? pGroupEntry[0].type : 'group', children: []}, {at})
            })
            return
          }
        }
      }
      normalizeNode(entry)
    }
    return editor
  },
})

function Heading({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...attributes}>{children}</span>
  }

  return (
    <HeadingUI {...attributes} data-element-type={element.type}>
      <BlockTools element={element} />
      <BlockWrapper element={element} attributes={attributes} mode={mode}>
        {children}
      </BlockWrapper>
    </HeadingUI>
  )
}

function removeEmptyHeading(editor: Editor, entry: NodeEntry<Heading>): boolean | undefined {
  const [node, path] = entry
  if (node.children.length == 1) {
    let child = Editor.node(editor, path.concat(0))
    if (!('type' in child[0])) {
      Transforms.removeNodes(editor, {at: path})
      return true
    }
  }
}
