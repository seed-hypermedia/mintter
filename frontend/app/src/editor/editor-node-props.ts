import {MINTTER_LINK_PREFIX} from '@app/constants'
import {findPath} from '@app/editor/utils'
import {useFileIds} from '@app/file-provider'
import {
  FlowContent,
  GroupingContent,
  isFlowContent,
  isGroupContent,
  Paragraph,
  StaticParagraph as StaticParagraphType,
} from '@mintter/shared'
import {DragEvent, useMemo, useState} from 'react'
import {Editor, Transforms, Element as SlateElement} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'

export function useBlockProps(element: FlowContent) {
  let editor = useSlateStatic()
  let path = findPath(element)
  let parentGroup = Editor.above<GroupingContent>(editor, {
    match: isGroupContent,
    mode: 'lowest',
    at: path,
  })

  return useMemo(memoizedProps, [element, parentGroup])

  function memoizedProps() {
    return {
      blockProps: {
        'data-element-type': element.type,
        'data-block-id': element.id,
        'data-parent-group': parentGroup?.[0].type,
        'data-revision': element.revision,
      },
      parentNode: parentGroup?.[0],
      parentPath: parentGroup?.[1],
    }
  }
}

export function usePhrasingProps(
  editor: Editor,
  element: Paragraph | StaticParagraphType,
) {
  let [docId, version] = useFileIds()
  return useMemo(memoizeProps, [editor, docId, version, element])

  function memoizeProps() {
    let path = ReactEditor.findPath(editor, element)

    let parentBlock = Editor.above<FlowContent>(editor, {
      match: isFlowContent,
      mode: 'lowest',
      at: path,
    })

    let parentGroup = Editor.above<GroupingContent>(editor, {
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })

    return {
      elementProps: {
        'data-element-type': element.type,
        'data-parent-block': parentBlock?.[0].id,
        'data-parent-group': parentGroup?.[0].type,
        'data-highlight': `${docId}/${parentBlock?.[0].id}`,
        'data-reference': version
          ? `${MINTTER_LINK_PREFIX}${docId}/${version}/${parentBlock?.[0].id}`
          : undefined,
      },
      parentNode: parentBlock?.[0],
      parentPath: parentBlock?.[1],
    }
  }
}

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export type DndValues = {
  dndState: DndState
  disableWhileDrag: boolean
}

export type DndHandlers = {
  onDrop: (_e: DragEvent<HTMLDivElement>) => any
  onDragEnter: (_e: DragEvent<HTMLDivElement>) => void
  onDragEnd: (_e) => void
  onDragStart: (_e, _id: string, _data?: any) => void
}

export const useDragDrop = (editor: Editor): [DndValues, DndHandlers] => {
  const [disableWhileDrag, setIsDisableByDrag] = useState(false)
  const [dndState, setDndState] = useState<DndState>({
    fromPath: null,
    toPath: null,
  })

  const onDragEnter = (e) => {
    const target = e.target.closest('li')

    if (target) {
      const isListItem = target.dataset.nodeType === 'list-item'

      if (isListItem) return false

      const enteredIndex = [...target.parentNode.children].indexOf(target)
      const toPath = [enteredIndex, 0]
      setDndState({fromPath: dndState.fromPath, toPath})
    }
  }

  const onDragEnd = (e) => {
    e.target.removeAttribute('draggable')
    e.target.ondragstart = null
    e.target.ondragend = null
    e.target.ondragenter = null
    e.target.ondragover = null

    setIsDisableByDrag(false)
    setDndState({fromPath: null, toPath: null})
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (
      dndState.fromPath?.toString() === dndState.toPath?.toString() ||
      dndState.fromPath === null ||
      dndState.toPath === null
    ) {
      return undefined
    }

    Transforms.moveNodes(editor, {
      at: [dndState.fromPath[0]],
      to: [dndState.toPath[0]],
      mode: 'highest',
      match: (node) => Editor.isEditor(editor) && SlateElement.isElement(node),
    })

    e.dataTransfer.clearData()
  }

  const onDragStart = (
    e: DragEvent<HTMLDivElement>,
    elementId: string,
    fromPath: number[],
  ) => {
    setIsDisableByDrag(true)

    e.dataTransfer.setData('Text', '')
    e.dataTransfer.effectAllowed = 'move'

    const editorEl = document.querySelector<HTMLDivElement>(
      '[data-testid="editor"]',
    )

    if (editorEl) {
      editorEl.ondragenter = onDragEnter
      editorEl.ondragover = (event) => {
        event.preventDefault()
        return false
      }
      setDndState({fromPath, toPath: dndState.toPath})
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

// export function useEmbedProps(element: Embed, docId: string) {
//   let editor = useSlateStatic()

//   let path = findPath(element)
//   return useMemo(() => {
//     if (!path) return
//     let parentBlock = Editor.above<FlowContent>(editor, {
//       match: isFlowContent,
//       mode: 'lowest',
//       at: path,
//     })

//     return {
//       elementProps: {
//         'data-element-type': element.type,
//         'data-reference': `${docId}/${parentBlock?.[0].id}`,
//         'data-highlight':
//       },
//       parentNode: parentBlock?.[0],
//       parentPath: parentBlock?.[1],
//     }
//   }, [element, path, docId, editor])
// }
