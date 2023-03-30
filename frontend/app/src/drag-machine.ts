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
      toPath: Path
      element: HTMLLIElement
      currentPosX: number
      currentPosY: number
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
          const {dragOverRef} = context
          const {element, toPath, currentPosX, currentPosY} = event
          dragOverRef?.removeAttribute('data-action')
          if (context.nestedGroup) {
            for (const elem of context.nestedGroup) {
              elem.removeAttribute('data-action')
            }
          }
          const result = filterDragOverRef(
            element,
            editor,
            toPath,
            context,
            currentPosX,
          )
          let nestedGroup = result.nestedGroup
          if (context.nestedGroup) {
            const lastElement =
              context.nestedGroup[
                context.nestedGroup.length - 1
              ].getBoundingClientRect()
            const boundariesX = [
              context.nestedGroup[0].getBoundingClientRect().x,
              lastElement.x + lastElement.width,
            ]
            const boundariesY = [
              lastElement.y,
              lastElement.y + lastElement.height,
            ]
            if (
              currentPosX > boundariesX[0] &&
              currentPosX < boundariesX[1] &&
              currentPosY > boundariesY[0] &&
              currentPosY < boundariesY[1]
            ) {
              nestedGroup = context.nestedGroup
            }
          }
          if (nestedGroup && nestedGroup.includes(element)) {
            let hoveredElement = nestedGroup[nestedGroup.length - 1]

            if (nestedGroup.length === 1) {
              hoveredElement.setAttribute('data-action', 'dragged-bottom-group')
              return {
                dragOverRef: element,
                isTop: context.isTop,
                toPath,
              }
            }

            for (let i = 1; i < nestedGroup.length; i++) {
              nestedGroup[i - 1].removeAttribute('data-action')
              nestedGroup[i - 1].setAttribute('data-action', 'dragged-group')
              if (nestedGroup[i] === nestedGroup[nestedGroup.length - 1])
                nestedGroup[i].setAttribute(
                  'data-action',
                  'dragged-bottom-group',
                )
              if (currentPosX <= nestedGroup[i].getBoundingClientRect()['x']) {
                hoveredElement = nestedGroup[i - 1]
                hoveredElement.setAttribute('data-action', 'dragged-nested')
                nestedGroup[i].setAttribute(
                  'data-action',
                  'dragged-bottom-group',
                )
                break
              }
            }
            const hoveredNode = ReactEditor.toSlateNode(editor, hoveredElement)
            const hoveredPath = ReactEditor.findPath(editor, hoveredNode)
            if (hoveredElement != nestedGroup[nestedGroup.length - 1]) {
              return {
                dragOverRef: hoveredElement,
                isTop: false,
                toPath: hoveredPath,
                nestedGroup,
              }
            }
            return {
              dragOverRef: hoveredElement,
              isTop: context.isTop,
              toPath: hoveredPath,
              nestedGroup,
            }
          } else {
            if (!Path.equals(context.toPath, context.fromPath)) {
              result.isTop
                ? result.dragOverRef?.setAttribute('data-action', 'dragged-top')
                : result.dragOverRef?.setAttribute(
                    'data-action',
                    'dragged-bottom',
                  )
            }
            return result
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
                  (parentFromGroup && isLastBlock(parentFromGroup, fromPath)) ||
                  (context.nestedGroup &&
                    context.nestedGroup[0] === dragOverRef))
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

function getNestedGroup(block: NodeEntry<FlowContent>, editor: Editor) {
  let [node, path] = block
  const parentGroup = Editor.above<Group>(editor, {
    match: isGroupContent,
    mode: 'lowest',
    at: path,
  })
  if (
    !Editor.next(editor, {
      at: path,
    }) ||
    (parentGroup && isLastBlock(parentGroup, path))
  ) {
    let isSibling = false
    const groupStatements = [block]
    let parentPath = path
    while (!isSibling) {
      let parent = Editor.above<FlowContent>(editor, {
        match: isFlowContent,
        mode: 'lowest',
        at: parentPath,
      })
      parentPath = parentPath.slice(0, -2)
      if (parent) {
        const parentSibling = Editor.next(editor, {
          at: parentPath,
        })
        groupStatements.unshift(parent)
        if (parentSibling) {
          isSibling = true
          break
        }
      } else {
        isSibling = true
        break
      }
    }
    return groupStatements
  } else {
    return [] as NodeEntry<FlowContent>[]
  }
}

function filterDragOverRef(
  element: HTMLElement,
  editor: Editor,
  toPath: Path,
  context: DragContext,
  currentPosX: number,
) {
  const node = ReactEditor.toSlateNode(editor, element) as FlowContent
  const children = node.children as Node[]

  const childGroup = children.find((child: Node) => child.type === 'group')

  if (!childGroup && toPath.length > 2) {
    let groupStatements: NodeEntry<FlowContent>[] = getNestedGroup(
      [node, toPath] as NodeEntry<FlowContent>,
      editor,
    )
    if (groupStatements.length > 0) {
      let groupElements: HTMLElement[] = []
      for (const statement of groupStatements) {
        groupElements.push(ReactEditor.toDOMNode(editor, statement[0]))
      }

      return {
        dragOverRef: context.dragOverRef,
        isTop: context.isTop,
        nestedGroup: groupElements,
      }
    }
  }
  const paragraph = element.firstElementChild
  let isTop = context.isTop
  if (paragraph && paragraph.nodeName === 'P') {
    const {fromPath, toPath} = context
    if (fromPath && toPath) {
      if (Path.equals(fromPath, toPath) || Path.isAncestor(fromPath, toPath)) {
        return {dragOverRef: paragraph, isTop: false, nestedGroup: null}
      }
      if (Path.isAfter(fromPath, toPath) || Path.isAncestor(toPath, fromPath)) {
        isTop = true
      } else {
        isTop = false
      }
    }
    return {dragOverRef: paragraph, isTop, nestedGroup: null}
  }
  return {dragOverRef: element, isTop: isTop, nestedGroup: null}
}
