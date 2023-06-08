import {
  createId,
  isContent,
  isFlowContent,
  isMedia,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {Editor, Node, Path, Range, TextUnit, Transforms} from 'slate'
import {MintterEditor} from './mintter-changes/plugin'
import {isCollapsed, isFirstChild} from './utils'

export function withMedia(editor: Editor) {
  const {isVoid, insertBreak, deleteBackward} = editor

  editor.isVoid = function isVoidMedia(element) {
    return isMedia(element) || isVoid(element)
  }

  editor.insertBreak = function mediaInsertBreak() {
    if (insertBreakAtMedia(editor)) return
    insertBreak()
  }

  editor.deleteBackward = function mediaDeleteBackward(unit) {
    if (deleteBackwardAtMedia(editor)) return
    if (deleteBackwardBelowMedia(editor)) return
    deleteBackward(unit)
  }

  return editor
}

function insertBreakAtMedia(editor: Editor): boolean {
  if (!editor.selection) {
    console.warn('mediaInsertBreak: no editor selection')
    return false
  }

  // need to get the current paragraph content entry
  const mediaContent = editor.above({
    match: isMedia,
  })

  if (!mediaContent) {
    console.warn('mediaInsertBreak: no media above')
    return false
  }

  let [cNode, cPath] = mediaContent
  let blockPath = Path.parent(cPath)

  editor.withoutNormalizing(() => {
    let targetPath = Path.next(blockPath)
    let newblockId = createId()
    editor.insertNodes(statement({id: newblockId}, [paragraph([text('')])]), {
      at: targetPath,
    })
    editor.select(targetPath)

    MintterEditor.addChange(editor, ['moveBlock', newblockId])
    MintterEditor.addChange(editor, ['replaceBlock', newblockId])
  })
  return true
}

function deleteBackwardBelowMedia(editor: Editor): boolean {
  if (!editor.selection) {
    console.warn('deleteBackwardBelowMedia: no editor selection')
    return false
  }

  // need to get the current paragraph content entry
  const content = editor.above({
    match: isContent,
  })

  if (!content) {
    console.warn('deleteBackwardBelowMedia: no media above')
    return false
  }

  try {
    let [, cPath] = content
    let blockPath = Path.parent(cPath)
    if (isFirstChild(blockPath)) {
      console.warn('deleteBackwardBelowMedia: current block is the first block')
      return false
    }
    if (editor.selection.anchor.offset == 0) {
      let prevBlockPath = Path.previous(blockPath)
      let prevContentPath = [...prevBlockPath, 0]
      let prevContentNode = Node.get(editor, prevContentPath)
      if (!prevContentNode) {
        console.warn('deleteBackwardBelowMedia: no prevContentNode')
        return false
      }

      if (isMedia(prevContentNode)) {
        // the previous block is a media content, we should remove the current block and select the above media
        editor.withoutNormalizing(() => {
          editor.removeNodes({
            at: blockPath,
          })
          editor.select(prevContentPath)
        })
        return true
      }
    }
    return false
  } catch (error) {
    console.warn('deleteBackwardBelowMedia: catch error', error)
    return false
  }
}

function deleteBackwardAtMedia(editor: Editor): boolean {
  if (!editor.selection) {
    console.warn('deleteBackwardAtMedia: no editor selection')
    return false
  }

  if (!isCollapsed(editor.selection)) {
    console.warn('deleteBackwardAtMedia: selection is not collapsed')
    return false
  }

  // need to get the current paragraph content entry
  const mediaContent = editor.above({
    match: isMedia,
  })

  if (!mediaContent) {
    console.warn('deleteBackwardAtMedia: no media above')
    return false
  }

  let [cNode, cPath] = mediaContent
  let blockPath = Path.parent(cPath)
  let blockNode = Node.get(editor, blockPath)

  if (!isFlowContent(blockNode)) {
    console.warn('deleteBackwardAtMedia: no block ')
    return false
  }
  editor.withoutNormalizing(() => {
    editor.insertNodes(paragraph([text('')]), {at: cPath})
    editor.removeNodes({at: Path.next(cPath)})
    editor.select(cPath)
  })

  return true
}
