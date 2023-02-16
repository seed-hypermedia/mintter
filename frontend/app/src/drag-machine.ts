import {isFlowContent} from '@mintter/shared'
import {Editor, Path, Transforms, Element as SlateElement, Node} from 'slate'
import {assign, createMachine, send} from 'xstate'

type DragContext = {
  dragOverRef: HTMLLIElement | null
  dragRef: HTMLLIElement | null
  fromPath: Path | null
  toPath: Path | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLLIElement}
  | {type: 'DROPPED'; editor: Editor}
  | {type: 'DRAG.OVER'; toPath: Path; element: HTMLLIElement}

export var dragMachine = createMachine(
  {
    predictableActionArguments: true,
    context: {dragOverRef: null, dragRef: null, fromPath: null, toPath: null},
    schema: {context: {} as DragContext, events: {} as DragEvent},
    tsTypes: {} as import('./drag-machine.typegen').Typegen0,
    id: 'drag-machine',
    description: 'empty',
    initial: 'inactive',
    states: {
      inactive: {
        on: {
          'DRAG.START': {
            actions: ['setFromPath', 'setDragRef'],
            target: 'active',
          },
        },
        entry: ['resetPaths'],
      },
      active: {
        on: {
          DROPPED: {
            actions: ['performMove'],
            target: 'inactive',
          },
          'DRAG.OVER': {
            actions: ['setToPath', 'setDragOverRef'],
          },
        },
      },
    },
  },
  {
    actions: {
      setDragOverRef: assign({
        dragOverRef: (context, event) => {
          context.dragOverRef?.removeAttribute('data-action')
          const element = event.element
          element.setAttribute('data-action', 'dragged')
          return element
        },
      }),
      setDragRef: assign({
        dragRef: (context, event) => {
          context.dragRef?.ondragstart === null
          const element = event.element

          const onDragStart = (e: DragEvent<HTMLLIElement>) => {
            // console.log(e.target['data-block-id'])
            e.dataTransfer?.setData('text', '')
            e.dataTransfer.effectAllowed = 'move'
          }

          const onDragEnd = (e) => {
            e.target.removeAttribute('draggable')
            e.target.ondragstart = null
            e.target.ondragend = null
            e.target.ondragenter = null
            e.target.ondragover = null
          }

          element.setAttribute('draggable', 'true')
          element.ondragstart = (event) => {
            onDragStart(event)
          }
          element.ondragend = onDragEnd
          return element
        },
      }),
      setFromPath: assign({
        fromPath: (_, event) => {
          return event.fromPath
        },
      }),
      setToPath: assign({
        toPath: (_, event) => {
          return event.toPath
        },
      }),
      // @ts-ignore
      resetPaths: assign({
        dragOverRef: null,
        fromPath: null,
        toPath: null,
      }),
      performMove: (context, event) => {
        const {fromPath, toPath, dragRef, dragOverRef} = context
        dragOverRef?.removeAttribute('data-action')
        dragRef?.removeAttribute('draggable')
        if (fromPath && toPath) {
          if (fromPath === toPath || toPath === null) return
          if (Path.isAncestor(fromPath, toPath)) return
          console.log(fromPath, toPath)
          Editor.withoutNormalizing(event.editor, () => {
            Transforms.moveNodes(event.editor, {
              at: fromPath,
              to: toPath,
              mode: 'highest',
              match: (node) =>
                Editor.isEditor(event.editor) && isFlowContent(node),
            })
            console.log(event.editor.children)
            console.log(
              Node.get(event.editor, fromPath),
              Node.get(event.editor, toPath),
            )
          })
        }
      },
    },
  },
)
