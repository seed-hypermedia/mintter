import {isFlowContent} from '@mintter/shared'
import React from 'react'
import {Editor, Path, Transforms, Element as SlateElement, Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine, send} from 'xstate'

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
      states: {
        inactive: {
          on: {
            'DRAG.START': {
              actions: ['deselectEditor', 'setFromPath', 'setDragRef'],
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
        // setEditor: assign({
        //   editor: (_, event) => {
        //     return event.editor
        //   },
        // }),
        deselectEditor: (context) => {
          ReactEditor.deselect(context.editor)
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
          const {fromPath, toPath, dragOverRef, editor} = context
          // console.log(dragOverRef)
          dragOverRef?.removeAttribute('data-action')
          if (fromPath && toPath && editor) {
            if (fromPath === toPath || fromPath === null || toPath === null)
              return
            if (Path.isAncestor(fromPath, toPath)) return
            if (fromPath) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.deselect(editor)
                Transforms.select(editor, fromPath)
              })
            } else {
              ReactEditor.focus(editor)
            }
            // ReactEditor.focus(editor as any)
            Editor.withoutNormalizing(editor, () => {
              console.log(fromPath, toPath)
              // Transforms.deselect(editor)
              Transforms.moveNodes(editor, {
                at: fromPath,
                to: toPath,
                mode: 'lowest',
              })
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
          }
        },
      },
    },
  )
}
