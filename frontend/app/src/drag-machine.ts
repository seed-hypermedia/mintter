import {EditorMode} from '@app/editor/plugin-utils'
import {
  FlowContent,
  Group,
  isFlowContent,
  isGroupContent,
  text,
} from '@mintter/shared'
import React from 'react'
import {Editor, Path, Transforms, NodeEntry, Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {assign, createMachine, actions} from 'xstate'

let {send} = actions
type DragContext = {
  editor: Editor
  dragOverRef: Element | null
  dragRef: HTMLLIElement | null
  fromPath: Path | null
  toPath: Path | null
  isTop: boolean
  nestedGroup: HTMLElement[] | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLLIElement}
  | {type: 'DROPPED'}
  | {
      type: 'DRAG.OVER'
      toPath: Path | null
      element: HTMLLIElement | null
      currentPos: number
    }
  | {type: 'DRAGGING.OFF'}
  | {type: 'SET.NESTED.GROUP'; nestedGroup: HTMLElement[] | null}

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
        isTop: false,
        nestedGroup: null,
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
            'SET.NESTED.GROUP': {
              actions: ['setNestedGroup'],
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
          const {nestedGroup, dragOverRef} = context
          if (event.element) {
            if (nestedGroup) {
              for (let i = 0; i < nestedGroup.length; i++) {
                nestedGroup[i].removeAttribute('data-action')
              }
            }
            dragOverRef?.removeAttribute('data-action')
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
              return {dragOverRef: paragraph, isTop, nestedGroup: null}
            }
            return {dragOverRef: element, isTop: isTop, nestedGroup: null}
          }
          if (nestedGroup) {
            dragOverRef?.removeAttribute('data-action')
            let hoveredElement = nestedGroup[nestedGroup.length - 1]

            for (let i = 1; i < nestedGroup.length; i++) {
              nestedGroup[i - 1].removeAttribute('data-action')
              nestedGroup[i - 1].setAttribute('data-action', 'dragged-group')
              if (nestedGroup[i] === nestedGroup[nestedGroup.length - 1])
                nestedGroup[i].setAttribute('data-action', 'dragged-bottom')
              if (
                event.currentPos <= nestedGroup[i].getBoundingClientRect()['x']
              ) {
                hoveredElement = nestedGroup[i - 1]
                hoveredElement.setAttribute('data-action', 'dragged-nested')
                nestedGroup[i].setAttribute('data-action', 'dragged-bottom')
                break
              }
            }
            const hoveredNode = ReactEditor.toSlateNode(editor, hoveredElement)
            const toPath = ReactEditor.findPath(editor, hoveredNode)
            if (hoveredElement != nestedGroup[nestedGroup.length - 1]) {
              return {dragOverRef: hoveredElement, isTop: false, toPath}
            }
            return {
              dragOverRef: hoveredElement,
              isTop: context.isTop,
              toPath,
            }
          } else {
            if (dragOverRef !== null) {
              const element = ReactEditor.toSlateNode(editor, dragOverRef)
              const path = ReactEditor.findPath(editor, element)
              const parentBlock = Editor.above<FlowContent>(editor, {
                match: isFlowContent,
                mode: 'lowest',
                at: path,
              })

              if (parentBlock) {
                const [node, ancestorPath] = parentBlock

                const children = node.children as Node[]

                const childGroup = children.find(
                  (child: Node) => child.type === 'group',
                )

                if (!childGroup) {
                  const firstParent = Editor.node(
                    editor,
                    path.slice(0, 2) as Path,
                  )
                  let groupStatements = []
                  let groupElements: HTMLElement[] = []
                  const descendantsGen = Node.nodes(firstParent[0], {
                    to: path.slice(2),
                  })
                  for (let des of descendantsGen) {
                    if (des[0].type === 'statement') {
                      if (des.)
                      des[1] = [...path.slice(0, 2), ...des[1]]
                      groupStatements.push(des)
                    }
                  }
                  for (const statement of groupStatements) {
                    groupElements.push(
                      ReactEditor.toDOMNode(editor, statement[0]),
                    )
                  }

                  dragOverRef.removeAttribute('data-action')
                  dragOverRef.setAttribute('data-action', 'dragged-bottom')

                  return {
                    dragOverRef: context.dragOverRef,
                    isTop: context.isTop,
                    nestedGroup: groupElements,
                  }
                }
              }
            }
            return {dragOverRef: context.dragOverRef, isTop: context.isTop}
          }
        }),
        setDragRef: assign({
          dragRef: (context, event) => {
            context.dragRef?.ondragstart === null
            const element = event.element

            const onDragStart = (e: any) => {
              e.dataTransfer?.setData('text', '')
              e.dataTransfer.effectAllowed = 'none'
              e.dataTransfer.dropEffect = 'none'
            }

            const onDragEnd = (e: any) => {
              e.target.removeAttribute('draggable')
              e.target.ondragstart = null
              e.target.ondragend = null
              e.target.ondragenter = null
              e.target.ondragover = null
            }

            if (editor.mode == EditorMode.Draft) {
              element.setAttribute('draggable', 'true')
              element.addEventListener('dragstart', onDragStart)
              element.addEventListener('dragend', onDragEnd)
              return element
            }
          },
        }),
        setFromPath: assign({
          fromPath: (_, event) => {
            return event.fromPath
          },
        }),
        setToPath: assign({
          toPath: (context, event) => {
            return event.toPath !== null ? event.toPath : context.toPath
          },
        }),
        setNestedGroup: assign({
          nestedGroup: (_, event) => {
            console.log(event.nestedGroup, 'here')
            return event.nestedGroup
          },
        }),
        // @ts-ignore
        resetPaths: assign({
          dragRef: null,
          dragOverRef: null,
          fromPath: null,
          toPath: null,
          nestedGroup: null,
        }),
        performMove: (context, event) => {
          const {fromPath, toPath, dragOverRef, editor, isTop, nestedGroup} =
            context
          dragOverRef?.removeAttribute('data-action')
          if (nestedGroup) {
            for (let i = 0; i < nestedGroup.length; i++) {
              nestedGroup[i].removeAttribute('data-action')
            }
          }
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

// function isLastSibling(node: NodeEntry, parentEntry: NodeEntry) {
//   let [parentNode, parentPath] = parentEntry;
//   return Path.equals(node[1], parentNode)
// }
