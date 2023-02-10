import {EditorMode} from '@app/editor/plugin-utils'
import {MutableRefObject, useEffect, useState} from 'react'
import {InterpreterFrom} from 'xstate'
import { dragMachine } from '@app/drag-machine'
import {createInterpreterContext} from './utils/machine-utils'
import { Editor, NodeEntry, Transforms, Element as SlateElement } from 'slate'
import { FlowContent } from '@mintter/shared'
export type DragInterpret = InterpreterFrom<typeof dragMachine>

const [DragProvider, useDrag, createDragSelector] =
  createInterpreterContext<DragInterpret>('Drag')

export {DragProvider, useDrag}

// export function useDragObserve(
//   mode: EditorMode,
//   block: NodeEntry<FlowContent>,
// ) {
//   let service = useDrag();
//   service.send({type: 'DRAG.START', blockId: block[0].id, blockPath: block[1]});
// }

// export const getCurrentBlock = createDragSelector(
//   (state) => state.context.draggedBlock,
// )

// export const getCurrentTarget = createDragSelector(
//   (state) => state.context.targetPath,
// )



export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export type DndValues = {
  dndState: DndState
  disableWhileDrag: boolean
}

export type DndHandlers = {
  onDrop: (_e: DragEvent) => any
  onDragEnter: (_e: DragEvent) => void
  onDragEnd: (_e) => void
  onDragStart: (_e, _data?: any) => void
}

export const useDragDrop = (editor: Editor): [DndValues, DndHandlers] => {
  const [disableWhileDrag, setIsDisableByDrag] = useState(false)
  const [dndState, setDndState] = useState<DndState>(() => ({
    fromPath: null,
    toPath: null,
  }))

  const onDragEnter = (e) => {
    const target = e.target.closest('li')

    if (target) {
      const isListItem = target.dataset.nodeType === 'list-item'

      if (isListItem) return false

      const enteredIndex = [...target.parentNode.children].indexOf(target)
      const toPath = [enteredIndex, 0]
      setDndState((prevDragState) => ({...prevDragState, toPath}))
    }
  }

  const onDragEnd = (e) => {
    e.target.removeAttribute('draggable')
    e.target.ondragstart = null
    e.target.ondragend = null
    e.target.ondragenter = null
    e.target.ondragover = null

    setIsDisableByDrag(false)
    // setDndState({fromPath: null, toPath: null})
  }

  const onDrop = (e: DragEvent) => {
    // if (
    //   dndState.fromPath?.toString() === dndState.toPath?.toString() ||
    //   dndState.fromPath === null ||
    //   dndState.toPath === null
    // ) {
    //   return undefined
    // }

    // Transforms.moveNodes(editor, {
    //   at: [dndState.fromPath[0]],
    //   to: [dndState.toPath[0]],
    //   mode: 'highest',
    //   match: (node) => Editor.isEditor(editor) && SlateElement.isElement(node),
    // })
    e.preventDefault()

    Transforms.moveNodes(editor, {
      at: [0, 0],
      to: [0, 1],
      mode: 'highest',
      match: (node) => Editor.isEditor(editor) && SlateElement.isElement(node),
    })

    e.dataTransfer?.clearData()
  }

  const onDragStart = (e: DragEvent, fromPath: number[]) => {
    setIsDisableByDrag(true)
    // console.log(e, fromPath)

    e.dataTransfer?.setData('Text', '')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    e.dataTransfer!.effectAllowed = 'move'

    const editorEl = document.querySelector<HTMLDivElement>(
      '[data-testid="editor"]',
    )

    if (editorEl) {
      editorEl.ondragenter = onDragEnter
      editorEl.ondragover = (event) => {
        event.preventDefault()
        return false
      }
      setDndState((prevDragState) => ({...prevDragState, fromPath}))
      // (prevDragState) => ({...prevDragState, fromPath: fromPath})
    }
  }

  const values = {dndState, disableWhileDrag}
  const handlers = {
    onDrop,
    onDragEnd,
    onDragEnter,
    onDragStart,
  }

  return [values, handlers]
}
