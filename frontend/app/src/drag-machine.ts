import {Empty} from '@bufbuild/protobuf'
import {FlowContent} from './../../shared/src/mttast/types'
import {Group, isFlowContent, isGroupContent} from '@mintter/shared'
import React from 'react'
import {
  Editor,
  Path,
  Transforms,
  Element as SlateElement,
  Node,
  NodeEntry,
} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine, actions} from 'xstate'

let {send} = actions
type DragContext = {
  editor: Editor
  dragOverRef: HTMLLIElement | null
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
        stopDrag: send({type: 'DRAGGING.OFF'}, {delay: 1000}),
        setDraggingOff: (context) => {
          console.log('dragging off')
          context.editor.dragging = false
        },
        setDragOverRef: assign({
          dragOverRef: (context, event) => {
            context.dragOverRef?.removeAttribute('data-action')
            const element = event.element
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
          console.log('DRAGGING PERFORM', context, event)
          const {fromPath, toPath, dragOverRef, editor} = context
          // console.log(dragOverRef)
          dragOverRef?.removeAttribute('data-action')
          if (fromPath && toPath && editor) {
            if (fromPath === toPath || fromPath === null || toPath === null)
              return
            if (Path.isAncestor(fromPath, toPath)) return
            // if (fromPath) {
            //   Editor.withoutNormalizing(editor, () => {
            //     Transforms.deselect(editor)
            //     Transforms.select(editor, Editor.end(editor, toPath))
            //   })
            // } else {
            //   ReactEditor.focus(editor)
            // }
            // ReactEditor.focus(editor as any)
            const parentBlock = Editor.above<Group>(editor, {
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

            // const children = Node.elements(parentBlock[0])
            // for (const child of children) {
            //   console.log(child)
            // }
            // console.log(Path.hasPrevious(fromPath))
            // console.log(Path.next(fromPath))
            Transforms.deselect(editor)
            ReactEditor.deselect(editor)
            ReactEditor.blur(editor)
            Editor.withoutNormalizing(editor, () => {
              Transforms.moveNodes(editor, {
                at: fromPath,
                to: toPath,
                mode: 'lowest',
              })
              if (parentGroup && parentGroup?.[0].children.length === 1) {
                console.log('here', parentGroup?.[0].children.length)
                Transforms.removeNodes(editor, {
                  at: parentGroup[1],
                })
              }
              Transforms.deselect(editor)
              ReactEditor.deselect(editor)
              ReactEditor.blur(editor)

              // if (fromPath.length === toPath.length) {
              //   Transforms.select(editor, {
              //     anchor: {path: toPath, offset: 0},
              //     focus: {path: toPath, offset: 0},
              //     // anchor: {path: [], offset: 0},
              //     // focus: {path: [], offset: 0},
              //   })
              // } else {
              // Transforms.select(editor, {
              //   anchor: {path: [], offset: 0},
              //   focus: {path: [], offset: 0},
              // })
              // }
              // console.log(editor.children)
              // console.log(
              //   ReactEditor.toDOMNode(editor, Node.get(editor, fromPath)),
              //   ReactEditor.toDOMNode(editor, Node.get(editor, toPath)),
              // )
            })
            // TODO: remove the parent group for the `fromPath`:
            // - if its Empty
            // - if the block has siblings
            // - if it the only child
          }
        },
      },
    },
  )
}
