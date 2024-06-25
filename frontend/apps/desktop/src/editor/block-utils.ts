import { HMBlockChildrenType } from '@shm/shared'
import { Node } from '@tiptap/pm/model'
import { EditorView } from '@tiptap/pm/view'
import { useEffect, useState } from 'react'
import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  getBlockInfoFromPos
} from './blocknote'
import { getNodeById } from './blocknote/core/api/util/nodeUtil'
import { HMBlockSchema } from './schema'

export function useSelected(
  block: BlockNoteBlock<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) {
  const [selected, setSelected] = useState(false)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

  useEffect(() => {
    if (editor) {
      const selectedNode = getBlockInfoFromPos(
        tiptapEditor.state.doc,
        tiptapEditor.state.selection.from,
      )
      if (selectedNode && selectedNode.id) {
        if (
          selectedNode.id === block.id &&
          selectedNode.startPos === selection.$anchor.pos
        ) {
          setSelected(true)
        } else if (selectedNode.id !== block.id) {
          setSelected(false)
        }
      }
    }
  }, [selection])

  return selected
}

export function updateGroup(
  editor: BlockNoteEditor<HMBlockSchema>,
  block: any,
  listType: HMBlockChildrenType,
) {
  let {posBeforeNode} = getNodeById(block.id, editor._tiptapEditor.state.doc)

  const posData = getBlockInfoFromPos(
    editor._tiptapEditor.state.doc,
    posBeforeNode + 1,
  )

  if (!posData) return

  const {startPos} = posData
  editor.focus()
  editor._tiptapEditor.commands.UpdateGroup(startPos, listType, false)
}

// Find the next block from provided position or from selection
export function findNextBlock(view: EditorView, pos?: number) {
  const {state} = view
  const currentPos = pos ? pos : state.selection.from
  const blockInfo = getBlockInfoFromPos(state.doc, currentPos)!
  let nextBlock: Node | undefined
  let nextBlockPos: number | undefined
  // Find first child
  if (blockInfo.node.lastChild?.type.name === 'blockGroup') {
    state.doc.nodesBetween(
      blockInfo.startPos,
      blockInfo.endPos,
      (node, pos) => {
        if (node.attrs.id === blockInfo.node.lastChild?.firstChild?.attrs.id) {
          nextBlock = node
          nextBlockPos = pos
        }
      },
    )
  }
  const maybePos = pos ? state.doc.resolve(pos) : state.selection.$to
  const nextBlockInfo = getBlockInfoFromPos(state.doc, maybePos.end() + 3)
  // If there is first child, return it as a next block
  if (nextBlock && nextBlockPos) {
    if (!nextBlockInfo || nextBlockPos <= nextBlockInfo.startPos - 1)
      return {
        nextBlock,
        nextBlockPos,
      }
  }
  if (!nextBlockInfo || nextBlockInfo.startPos < currentPos) return undefined
  return {
    nextBlock: nextBlockInfo.node,
    nextBlockPos: nextBlockInfo.startPos - 1,
  }
}

// Find the previous block from provided position or from selection
export function findPreviousBlock(view: EditorView, pos?: number) {
  const {state} = view
  const currentPos = pos ? pos : state.selection.from
  const $currentPos = state.doc.resolve(currentPos)
  if ($currentPos.start() <= 3) return undefined
  const blockInfo = getBlockInfoFromPos(state.doc, currentPos)!
  const prevBlockInfo = getBlockInfoFromPos(state.doc, $currentPos.start() - 3)
  // If prev block has no children, return it
  if (prevBlockInfo.node.childCount === 1)
    return {
      prevBlock: prevBlockInfo.node,
      prevBlockPos: prevBlockInfo.startPos - 1,
    }
  let prevBlock: Node | undefined
  let prevBlockPos: number | undefined
  // Find last child of prev block and return it
  if (prevBlockInfo.node.lastChild?.type.name === 'blockGroup') {
    state.doc.nodesBetween(
      prevBlockInfo.startPos + 3,
      blockInfo.startPos - 2,
      (node, pos) => {
        if (node.type.name === 'blockContainer') {
          prevBlock = node
          prevBlockPos = pos
        }
      },
    )
  }
  if (prevBlock && prevBlockPos) return {prevBlock, prevBlockPos}
}