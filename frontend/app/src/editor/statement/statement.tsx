import {BlockWrapper} from '@app/editor/block-wrapper'
import {useHoverBlockId} from '@app/editor/hover-context'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {Box} from '@components/box'
import {
  createId,
  FlowContent,
  isEmbed,
  isFlowContent,
  isGroupContent,
  isParagraph,
  isStatement,
  paragraph,
  statement,
  Statement as StatementType,
  text,
} from '@mintter/mttast'
import {Editor, Element, Node, NodeEntry, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isFirstChild} from '../utils'

export const ELEMENT_STATEMENT = 'statement'

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isStatement(element)) {
        return (
          <Statement
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </Statement>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {normalizeNode, insertBreak, deleteBackward} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isStatement(node)) {
        if (removeEmptyStatement(editor, entry as NodeEntry<StatementType>))
          return

        if (
          addParagraphToNestedGroup(editor, entry as NodeEntry<StatementType>)
        )
          return
        for (const [child, childPath] of Node.children(editor, path, {
          reverse: true,
        })) {
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
                Transforms.moveNodes(editor, {
                  at: childPath,
                  to: Path.next(childPath).concat(0),
                })
                return
              } else if (!isGroupContent(child)) {
                Transforms.moveNodes(editor, {
                  at: childPath,
                  to: Path.next(path),
                })
                return
              }
            }
          }

          if (childPath[childPath.length - 1] > 1) {
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }

          if (isGroupContent(child)) {
            let prev = Editor.previous(editor, {
              at: childPath,
              match: isFlowContent,
            })
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

    editor.insertBreak = function blockInsertBreak() {
      let {selection} = editor

      // we need to run this code when the selection starts at the beginning of any node (usually statement or paragraph).
      // if it's in the beginning (no matter if its collapsed or not) we need to insert above instead of keeping the blockId in place

      if (selection?.anchor.offset == 0) {
        let currentEntry = Editor.above(editor, {
          match: isFlowContent,
        })

        if (currentEntry) {
          let [, path] = currentEntry
          let isEnd = Editor.isEnd(editor, selection.focus, path)
          let isStart = Editor.isStart(editor, selection.anchor, path)
          let isEmbedOnly = hasEmbedOnly(currentEntry)
          if (isEnd) {
            insertBreak()
          } else {
            let newBlock = statement({id: createId()}, [paragraph([text('')])])
            Transforms.insertNodes(editor, newBlock, {at: path})
            changesService.addChange(['moveBlock', newBlock.id])
            changesService.addChange(['replaceBlock', newBlock.id])
            return
          }
        }
      } else {
        insertBreak()
      }
    }

    editor.deleteBackward = function blockDeleteBackwards(unit) {
      let {selection} = editor
      console.log('delete backwards!', selection)
      if (selection?.anchor.offset == 0) {
        let currentEntry = Editor.above(editor, {
          match: isFlowContent,
        })

        if (currentEntry) {
          let [node, path] = currentEntry
          if (!isFirstChild(path)) {
            let prevBlockPath = Path.previous(path)
            let prevBlockNode = Node.get(editor, prevBlockPath)

            if (
              !Node.string(prevBlockNode) &&
              !hasEmbedOnly([prevBlockNode, prevBlockPath])
            ) {
              Transforms.removeNodes(editor, {at: prevBlockPath})
              return
            }
          }
        }
      }

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

function addParagraphToNestedGroup(
  editor: Editor,
  entry: NodeEntry<StatementType>,
): boolean | undefined {
  let [node, path] = entry
  //@ts-ignore
  if (
    node.children.length > 2 &&
    isParagraph(node.children[1]) &&
    isGroupContent(node.children[2])
  ) {
    Transforms.moveNodes(editor, {at: path.concat(1), to: path.concat(2, 0)})
    return true
  }
}

function Statement({
  attributes,
  children,
  element,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  const hoverId = useHoverBlockId()
  let blockProps = {
    'data-element-type': element.type,
    'data-element-id': (element as StatementType).id,
    ...attributes,
  }
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...blockProps}>{children}</span>
  }

  return (
    <BlockWrapper
      element={element as StatementType}
      mode={mode}
      attributes={attributes}
    >
      <Box {...blockProps}>{children}</Box>
    </BlockWrapper>
  )
}

export function removeEmptyStatement(
  editor: Editor,
  entry: NodeEntry<StatementType>,
): boolean | undefined {
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

function hasEmbedOnly(entry: NodeEntry<FlowContent>) {
  let [node] = entry
  let hasContent = !!Node.string(node)
  let result = false

  if (!hasContent) {
    for (let childEntry of Node.descendants(node)) {
      let [child] = childEntry

      if (isEmbed(child)) {
        result = true
      }
    }
  }
  return result
}
