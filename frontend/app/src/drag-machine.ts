import {
  FlowContent,
  Group,
  isFlowContent,
  isGroupContent,
  text,
} from '@mintter/shared'
import React from 'react'
import {
  Editor,
  Path,
  Transforms,
  Element as SlateElement,
  NodeEntry,
  Node,
} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine, actions} from 'xstate'

let {send} = actions
type DragContext = {
  editor: Editor
  dragOverRef: Element | null
  dragRef: HTMLLIElement | null
  fromPath: Path | null
  toPath: Path | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLLIElement}
  | {type: 'DROPPED'; editor: Editor}
  | {type: 'DRAG.OVER'; toPath: Path; element: HTMLLIElement}
  | {type: 'DRAGGING.OFF'}

export const createDragMachine = (editor: Editor) => {
  return createMachine(
    {
      predictableActionArguments: true,
      context: {
        editor,
        dragOverRef: null,
        dragRef: null,
        fromPath: null,
        toPath: null,
      },
      schema: {context: {} as DragContext, events: {} as DragEvent},
      tsTypes: {} as import('./drag-machine.typegen').Typegen0,
      id: 'drag-machine',
      description: 'empty',
      initial: 'inactive',
      on: {
        'DRAGGING.OFF': {
          actions: ['setDraggingOff'],
        },
      },
      states: {
        inactive: {
          on: {
            'DRAG.START': {
              actions: [
                'deselectEditor',
                'startDrag',
                'setFromPath',
                'setDragRef',
              ],
              target: 'active',
            },
          },
          entry: ['resetPaths'],
        },
        active: {
          on: {
            DROPPED: {
              actions: ['performMove', 'stopDrag'],
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
        deselectEditor: (context) => {
          ReactEditor.deselect(context.editor)
        },
        startDrag: (context) => {
          context.editor.dragging = true
        },
        stopDrag: send({type: 'DRAGGING.OFF'}, {delay: 500}),
        setDraggingOff: (context) => {
          context.editor.dragging = false
        },
        setDragOverRef: assign({
          dragOverRef: (context, event) => {
            context.dragOverRef?.removeAttribute('data-action')
            const element: HTMLLIElement = event.element
            const paragraph = element.firstElementChild
            if (paragraph && paragraph.nodeName === 'P') {
              paragraph.setAttribute('data-action', 'dragged-over')
              return paragraph
            }
            element.setAttribute('data-action', 'dragged-over')
            return element
          },
        }),
        setDragRef: assign({
          dragRef: (context, event) => {
            context.dragRef?.ondragstart === null
            const element = event.element

            const onDragStart = (e: any) => {
              e.dataTransfer?.setData('text', '')
              e.dataTransfer.effectAllowed = 'move'
            }

            const onDragEnd = (e: any) => {
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
          dragRef: null,
          dragOverRef: null,
          fromPath: null,
          toPath: null,
        }),
        performMove: (context, event) => {
          const {fromPath, toPath, dragOverRef, editor} = context
          dragOverRef?.removeAttribute('data-action')
          if (fromPath && toPath && editor) {
            if (fromPath === toPath || fromPath === null || toPath === null)
              return
            if (Path.isAncestor(fromPath, toPath)) return
            const parentBlock = Editor.above<FlowContent>(editor, {
              match: isFlowContent,
              mode: 'lowest',
              at: fromPath,
            })
            let parentGroup: NodeEntry<Group> | undefined
            if (parentBlock) {
              parentGroup = Editor.above<Group>(editor, {
                match: isGroupContent,
                mode: 'lowest',
                at: fromPath,
              })
            }
            Transforms.deselect(editor)
            ReactEditor.deselect(editor)
            ReactEditor.blur(editor)
            Editor.withoutNormalizing(editor, () => {
              // if (parentGroup && parentGroup?.[0].children.length <= 1) {
              //   Transforms.moveNodes(editor, {
              //     at: fromPath,
              //     to: toPath,
              //     mode: 'highest',
              //   })
              //   // Transforms.removeNodes(editor, {
              //   //   at: parentGroup[1],
              //   // })
              // } else {
              Transforms.moveNodes(editor, {
                at: fromPath,
                to: toPath,
                mode: 'highest',
              })
              // }
              Transforms.deselect(editor)
              ReactEditor.deselect(editor)
              ReactEditor.blur(editor)
            })
          }
        },
      },
    },
  )
}
