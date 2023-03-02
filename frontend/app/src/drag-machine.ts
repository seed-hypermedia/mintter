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
  position: number
  editor: Editor
  dragOverRef: Element | null
  dragRef: HTMLLIElement | null
  fromPath: Path | null
  toPath: Path | null
  isTop: boolean
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLLIElement}
  | {type: 'DROPPED'; editor: Editor}
  | {type: 'DRAG.OVER'; toPath: Path; element: HTMLLIElement}
  | {
      type: 'DRAG.OVER.BOTTOM'
      nodes: NodeEntry[]
      currentX: number
      nestedElements: HTMLLIElement[]
    }
  | {type: 'BOTTOM.TO.PATH'; toPath: Path}
  | {type: 'DRAGGING.OFF'}
  | {type: 'MOUSE.MOVE'; position: number}
  | {type: 'SET.DRAGGING.POSITION'; isTop: boolean}

export const createDragMachine = (editor: Editor) => {
  return createMachine(
    {
      predictableActionArguments: true,
      context: {
        editor,
        position: 0,
        dragOverRef: null,
        dragRef: null,
        fromPath: null,
        toPath: null,
        isTop: false,
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
        'BOTTOM.TO.PATH': {
          actions: ['setToPath'],
        },
        'MOUSE.MOVE': {
          actions: ['setPosition'],
        },
        'SET.DRAGGING.POSITION': {
          actions: ['setTopPosition'],
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
            'DRAG.OVER.BOTTOM': {
              actions: ['setDragBottomRef'],
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
        setDragOverRef: assign((context, event) => {
          // dragOverRef: (context, event) => {
          context.dragOverRef?.removeAttribute('data-action')
          const element: HTMLLIElement = event.element
          const paragraph = element.firstElementChild
          let isTop = context.isTop
          if (paragraph && paragraph.nodeName === 'P') {
            const {fromPath, toPath} = context
            if (fromPath && toPath) {
              if (
                Path.equals(fromPath, toPath) ||
                Path.isAncestor(fromPath, toPath)
              ) {
                return paragraph
              }
              if (
                Path.isAfter(fromPath, toPath) ||
                Path.isAncestor(toPath, fromPath)
              ) {
                paragraph.setAttribute('data-action', 'dragged-top')
                isTop = true
              } else {
                paragraph.setAttribute('data-action', 'dragged-bottom')
                isTop = false
              }
            }
            return {dragOverRef: paragraph, isTop}
          }
          return {dragOverRef: element, isTop: isTop}
        }),
        setDragBottomRef: assign({
          dragOverRef: (context, event) => {
            context.dragOverRef?.removeAttribute('data-action')
            const {nestedElements, currentX, nodes} = event
            let hoveredElement = nestedElements[0]
            let index = 0
            for (let i = 0; i < nestedElements.length; i++) {
              if (currentX <= nestedElements[i].getBoundingClientRect()['x']) {
                hoveredElement = nestedElements[i - 1]
              }
            }
            hoveredElement.setAttribute('data-action', 'dragged-bottom')
            return hoveredElement
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
        setTopPosition: assign({
          isTop: (_, event) => {
            return event.isTop
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
        setPosition: assign({
          position: (_, event) => {
            return event.position
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
          const {fromPath, toPath, dragOverRef, editor, isTop} = context
          dragOverRef?.removeAttribute('data-action')
          if (fromPath && toPath && editor) {
            if (fromPath === toPath || fromPath === null || toPath === null)
              return
            if (Path.isAncestor(fromPath, toPath)) return
            const parentToGroup = Editor.above<Group>(editor, {
              match: isGroupContent,
              mode: 'lowest',
              at: toPath,
            })
            const parentFromGroup = Editor.above<Group>(editor, {
              match: isGroupContent,
              mode: 'lowest',
              at: fromPath,
            })
            Transforms.deselect(editor)
            ReactEditor.deselect(editor)
            ReactEditor.blur(editor)
            Editor.withoutNormalizing(editor, () => {
              let to = toPath
              if (
                !isTop &&
                ((parentToGroup && isLastBlock(parentToGroup, toPath)) ||
                  (parentFromGroup && isLastBlock(parentFromGroup, fromPath)))
              ) {
                to = Path.next(toPath)
              }
              Transforms.moveNodes(editor, {
                at: fromPath,
                to,
                mode: 'highest',
              })
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

function isLastBlock(parentGroup: NodeEntry<Group>, path: Path) {
  let [groupNode, groupPath] = parentGroup
  return groupNode.children.length - 1 === path[path.length - 1]
}
