import {BlockWrapper} from '@app/editor/block-wrapper'
import {useHoverBlockId} from '@app/editor/hover-context'
import type {Statement as StatementType} from '@mintter/mttast'
import {isFlowContent, isGroupContent, isParagraph, isStatement} from '@mintter/mttast'
import {Editor, Element, Node, NodeEntry, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isFirstChild} from '../utils'
import {StatementUI} from './statement-ui'

export const ELEMENT_STATEMENT = 'statement'

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isStatement(element)) {
        return (
          <Statement mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </Statement>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward, apply} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isStatement(node)) {
        if (removeEmptyStatement(editor, entry as NodeEntry<StatementType>)) return

        if (addParagraphToNestedGroup(editor, entry as NodeEntry<StatementType>)) return
        for (const [child, childPath] of Node.children(editor, path, {reverse: true})) {
          if (isFirstChild(childPath)) {
            if (isFlowContent(child)) {
              Transforms.unwrapNodes(editor, {at: childPath})
              return
            }

            if (!isParagraph(child)) {
              Transforms.setNodes(editor, {type: 'paragraph'}, {at: childPath})
              return
            }
          }

          if (isFlowContent(child)) {
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }

          if (childPath[childPath.length - 1] == 1) {
            // statement second child
            if (isParagraph(child)) {
              let index = childPath[childPath.length - 1]
              let nextChild = node.children[index + 1]
              // next child is grupo!
              if (isGroupContent(nextChild)) {
                Transforms.moveNodes(editor, {at: childPath, to: Path.next(childPath).concat(0)})
                return
              } else if (!isGroupContent(child)) {
                Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
                return
              }
            }
          }

          if (childPath[childPath.length - 1] > 1) {
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }

          if (isGroupContent(child)) {
            let prev = Editor.previous(editor, {at: childPath, match: isFlowContent})
            if (prev) {
              let [, pPath] = prev
              Transforms.moveNodes(editor, {at: childPath, to: pPath.concat(1)})
              return
            }
          }
        }
      }
      normalizeNode(entry)
    }

    editor.apply = (operation) => {
      console.log('operation: ', operation)
      apply(operation)
    }

    editor.deleteBackward = (unit) => {
      console.log('deleteBackward', unit)

      deleteBackward(unit)
    }

    return editor
  },
  onKeyDown: (editor) => (event) => {
    if (editor.selection && event.key == 'Enter') {
      if (event.shiftKey) {
        event.preventDefault()
        Transforms.insertText(editor, '\n')
        return
      }
    }
  },
})

function addParagraphToNestedGroup(editor: Editor, entry: NodeEntry<StatementType>): boolean | undefined {
  let [node, path] = entry
  //@ts-ignore
  if (node.children.length > 2 && isParagraph(node.children[1]) && isGroupContent(node.children[2])) {
    Transforms.moveNodes(editor, {at: path.concat(1), to: path.concat(2, 0)})
    return true
  }
}

function Statement({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  const hoverId = useHoverBlockId()
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <span data-element-type={element.type} data-element-id={element.id} {...attributes}>
        {children}
      </span>
    )
  }

  return (
    <StatementUI
      data-element-type={element.type}
      data-element-id={(element as StatementType).id}
      {...attributes}
      css={{
        backgroundColor: hoverId == (element as StatementType).id ? '$block-hover' : 'transparent',
      }}
    >
      <BlockWrapper element={element} mode={mode} attributes={attributes}>
        {children}
      </BlockWrapper>
    </StatementUI>
  )
}

export function removeEmptyStatement(editor: Editor, entry: NodeEntry<StatementType>): boolean | undefined {
  const [node, path] = entry
  if (node.children.length == 1) {
    const child = Editor.node(editor, path.concat(0))
    if (!('type' in child[0])) {
      Transforms.removeNodes(editor, {
        at: path,
      })
      return true
    }
  }
}
