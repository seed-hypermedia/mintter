import {Editor, Ancestor, Path, NodeEntry, Transforms} from 'slate'
import {
  isCollapsed,
  isNodeTypeIn,
  isRangeAtRoot,
  isFirstChild,
} from '@udecode/slate-plugins'
import {ELEMENT_BLOCK, ELEMENT_PARAGRAPH} from '../elements'

export const onKeyDownHierarchy = () => (e: KeyboardEvent, editor: Editor) => {
  let moved: boolean | undefined = false
  if (e.key === 'Tab') {
    if (editor.selection && isCollapsed(editor.selection)) {
      const res = isSelectionInBlock(editor)
      if (!res) return
      const {blockPath} = res

      e.preventDefault()

      const shiftTab = e.shiftKey
      if (shiftTab) {
        // move outside with shift+tab
        moved = moveBlockOutside(editor, blockPath)
        if (moved) e.preventDefault()
      } else {
        if (!isFirstChild(blockPath)) {
          // move inside if node is not the first one
          moveBlockInside(editor, blockPath)
        }
      }
    }
  }
}

function isSelectionInBlock(editor) {
  if (
    editor.selection &&
    isNodeTypeIn(editor, ELEMENT_BLOCK) &&
    !isRangeAtRoot(editor.selection)
  ) {
    const [pNode, pPath] = Editor.parent(editor, editor.selection)
    if (pNode.type !== ELEMENT_PARAGRAPH) return
    const [blockNode, blockPath] = Editor.parent(editor, pPath)
    if (blockNode.type !== ELEMENT_BLOCK) return

    return {
      blockNode,
      blockPath,
    }
  } else {
    return
  }
}

function moveBlockInside(editor: Editor, blockPath: number[]) {
  const previousSiblingBlock = Editor.node(
    editor,
    Path.previous(blockPath),
  ) as NodeEntry<Ancestor>
  console.log('moveBlockInside: ', {blockPath, previousSiblingBlock})
  if (previousSiblingBlock) {
    const [previousNode, previousPath] = previousSiblingBlock
    if (previousNode.type !== ELEMENT_BLOCK) return
    const newPath = previousPath.concat(previousNode.children.length)

    Transforms.moveNodes(editor, {at: blockPath, to: newPath})
  }

  return true
}

function moveBlockOutside(editor: Editor, blockPath: number[]) {
  let parentBlock = Editor.parent(editor, blockPath)

  if (parentBlock) {
    const [parentBlockNode, parentBlockPath] = parentBlock
    if (parentBlockNode.type !== ELEMENT_BLOCK) return
    const nextSiblingParentPath = Path.next(parentBlockPath)
    Transforms.moveNodes(editor, {at: blockPath, to: nextSiblingParentPath})
  }

  return true
}
