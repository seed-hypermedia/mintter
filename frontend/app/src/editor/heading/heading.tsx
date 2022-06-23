import {BlockWrapper} from '@app/editor/block-wrapper'
import {EditorMode} from '@app/editor/plugin-utils'
import {statementStyle} from '@app/editor/statement'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {FlowContent, Heading as HeadingType, isHeading} from '@mintter/mttast'
import {Editor, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {MintterEditor} from '../mintter-changes/plugin'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_HEADING = 'heading'

const headingStyle = css(statementStyle, {})

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
    const {normalizeNode, deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (isHeading(node)) {
        if (removeEmptyHeading(editor, entry as NodeEntry<HeadingType>)) return

        if (
          isFirstChild(path.concat(0)) &&
          !isStaticParagraph(node.children[0])
        ) {
          // transform to static paragraph if there's only one child and is not static paragraph
          // TODO: This will produce invalid paragraphs
          Transforms.setNodes(
            editor,
            {type: 'staticParagraph'},
            {at: path.concat(0)},
          )
          return
        } else if (node.children.length == 2) {
          if (!isGroupContent(node.children[1])) {
            // move second static paragraph outside if the second node is not a group
            let pGroupEntry = Editor.above(editor, {
              at: path.concat(1),
              match: isGroupContent,
            })

            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              let newBlock = statement({id: createId()})

              Transforms.setNodes(editor, {type: 'paragraph'}, {at})
              Transforms.wrapNodes(editor, newBlock, {at})
              Transforms.wrapNodes(
                editor,
                {
                  type: pGroupEntry ? pGroupEntry[0].type : 'group',
                  children: [],
                },
                {at},
              )
              MintterEditor.addChange(editor, ['replaceBlock', node.id])
              MintterEditor.addChange(editor, ['moveBlock', newBlock.id])
              MintterEditor.addChange(editor, ['replaceBlock', newBlock.id])
            })
            return
          }
        } else if (node.children.length > 2) {
          let secondChild = node.children[1]

          if (isStaticParagraph(secondChild)) {
            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              Transforms.moveNodes(editor, {at, to: path.concat(2, 0)})
              return
            })
          }
        }
      }

      normalizeNode(entry)
    }
    return editor
  },
})

function Heading({
  attributes,
  children,
  element,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  let blockProps = {
    'data-element-type': element.type,
    'data-element-id': (element as HeadingType).id,
    ...attributes,
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...blockProps}>{children}</span>
  }

  return (
    <BlockWrapper
      element={element as FlowContent}
      attributes={attributes}
      mode={mode}
    >
      <Box className={headingStyle()} {...blockProps}>
        {children}
      </Box>
    </BlockWrapper>
  )
}

function removeEmptyHeading(
  editor: Editor,
  entry: NodeEntry<Heading>,
): boolean | undefined {
  const [node, path] = entry
  if (node.children.length == 1) {
    let child = Editor.node(editor, path.concat(0))
    if (!('type' in child[0])) {
      Transforms.removeNodes(editor, {at: path})
      return true
    }
  }
}
