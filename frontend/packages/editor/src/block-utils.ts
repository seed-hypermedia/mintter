import {HMBlockChildrenType} from '@mintter/shared'
import {useEffect, useState} from 'react'
import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  getBlockInfoFromPos,
} from './blocknote'
import {getNodeById} from './blocknote/core/api/util/nodeUtil'
import {HMBlockSchema} from './schema'

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
