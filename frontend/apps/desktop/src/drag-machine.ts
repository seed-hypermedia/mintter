import {EditorMode} from '@app/editor/plugin-utils'
import {
  FlowContent,
  Group,
  isFlowContent,
  isGroup,
  isGroupContent,
} from '@mintter/shared'
import {Editor, Node, NodeEntry, Path, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {actions, assign, createMachine} from 'xstate'
import {findPath} from './editor/utils'

let {send} = actions

export enum LineType {
  TOP,
  BOTTOM,
  BOTTOM_GROUP,
  GROUP,
  NESTED,
}

export type DragEntry = {
  entry: NodeEntry
  line: LineType | null
}

type DragContext = {
  editor: Editor
  dragOverRef: DragEntry | null
  dragRef: HTMLElement | null
  fromPath: Path | null
  toPath: Path | null
  isTop: boolean
  nestedGroup: DragEntry[] | null
}

type DragEvent =
  | {type: 'DRAG.START'; fromPath: Path; element: HTMLLIElement}
  | {type: 'DROPPED'}
  | {
      type: 'DRAG.OVER'
      toPath: Path
      element?: NodeEntry<FlowContent> | null
      currentPosX?: number
      currentPosY?: number
    }
  | {type: 'DRAGGING.OFF'}
  | {type: 'SET.NESTED.GROUP'; nestedGroup: DragEntry[] | null}

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
          if (context.editor) ReactEditor.deselect(context.editor)
        },
        startDrag: (context) => {
          if (context.editor) context.editor.dragging = true
        },
        stopDrag: send({type: 'DRAGGING.OFF'}, {delay: 500}),
        setDraggingOff: (context) => {
          if (context.editor) context.editor.dragging = false
        },
        setDragOverRef: assign((context, event) => {
          const {element, toPath, currentPosX, currentPosY} = event
          const result = filterDragOverRef({editor, toPath, context, element})
          let nestedGroup = result.nestedGroup
          if (context.nestedGroup) {
            const lastElement = ReactEditor.toDOMNode(
              editor,
              context.nestedGroup[context.nestedGroup.length - 1].entry[0],
            ).getBoundingClientRect()
            const boundariesX = [
              ReactEditor.toDOMNode(
                editor,
                context.nestedGroup[0].entry[0],
              ).getBoundingClientRect().x,
              lastElement.x + lastElement.width,
            ]
            const boundariesY = [
              lastElement.y,
              lastElement.y + lastElement.height,
            ]
            if (
              currentPosX &&
              currentPosY &&
              currentPosX > boundariesX[0] &&
              currentPosX < boundariesX[1] &&
              currentPosY > boundariesY[0] &&
              currentPosY < boundariesY[1]
            ) {
              nestedGroup = context.nestedGroup
            }
          }
          if (
            nestedGroup &&
            element &&
            nestedGroup.some((el) => Path.equals(el.entry[1], element[1]))
          ) {
            let hoveredElement: DragEntry = nestedGroup[nestedGroup.length - 1]

            if (nestedGroup.length === 1) {
              return {
                dragOverRef: {entry: element, line: null} as DragEntry,
                isTop: context.isTop,
                toPath,
              }
            }

            for (let i = 1; i < nestedGroup.length; i++) {
              nestedGroup[i - 1].line = LineType.GROUP
              if (nestedGroup[i] === nestedGroup[nestedGroup.length - 1])
                nestedGroup[i].line = LineType.BOTTOM_GROUP
              if (
                currentPosX &&
                currentPosX <=
                  ReactEditor.toDOMNode(
                    editor,
                    nestedGroup[i].entry[0],
                  ).getBoundingClientRect()['x'] +
                    36
              ) {
                nestedGroup[i - 1].line = LineType.NESTED
                hoveredElement = nestedGroup[i - 1]
                nestedGroup[i].line = LineType.BOTTOM_GROUP
                break
              }
            }
            const hoveredPath = findPath(hoveredElement.entry[0])
            return {
              dragOverRef: hoveredElement,
              isTop: false,
              toPath: hoveredPath,
              nestedGroup,
            }
          } else {
            if (
              Path.isPath(context.toPath) &&
              Path.isPath(context.fromPath) &&
              !Path.equals(context.toPath, context.fromPath)
            ) {
              if (result.dragOverRef) {
                result.isTop
                  ? (result.dragOverRef.line = LineType.TOP)
                  : (result.dragOverRef.line = LineType.BOTTOM)
              }
            }
            return result
          }
        }),
        setDragRef: assign({
          dragRef: (context, event) => {
            context.dragRef?.ondragstart === null
            const element: HTMLElement = event.element

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
            }
            return element
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
        performMove: (context) => {
          const {fromPath, toPath, dragOverRef, editor, isTop, nestedGroup} =
            context
          if (fromPath && toPath && fromPath !== toPath) {
            if (Path.isAncestor(fromPath, toPath)) return
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
                ((parentFromGroup && isLastBlock(parentFromGroup, fromPath)) ||
                  fromPath.length !== toPath.length ||
                  (nestedGroup &&
                    dragOverRef &&
                    nestedGroup.includes(dragOverRef)))
              )
                to = Path.next(toPath)
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
    const nestedGroup: DragEntry[] = [{entry: block, line: null}]
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
        nestedGroup.unshift({entry: parent, line: null})
        if (parentSibling) {
          isSibling = true
          break
        }
      } else {
        isSibling = true
        break
      }
    }
    return nestedGroup
  } else {
    return [] as DragEntry[]
  }
}

function filterDragOverRef({
  editor,
  element,
  toPath,
  context,
}: {
  editor: Editor
  toPath: Path
  context: DragContext
  element?: NodeEntry<FlowContent> | null
}) {
  if (!element) return {}
  const node = element[0]

  const children = node.children as Node[]

  const childGroup = children.find(isGroup)

  if (!childGroup && toPath.length > 2) {
    let nestedGroup: DragEntry[] = getNestedGroup(
      [node, toPath] as NodeEntry<FlowContent>,
      editor,
    )
    if (nestedGroup.length > 0) {
      return {
        dragOverRef: context.dragOverRef,
        isTop: context.isTop,
        nestedGroup: nestedGroup,
      }
    }
  }
  const paragraph = node.children[0]
  let isTop = context.isTop
  if (paragraph) {
    const {fromPath, toPath} = context
    if (fromPath && toPath) {
      if (Path.equals(fromPath, toPath) || Path.isAncestor(fromPath, toPath)) {
        return {
          dragOverRef: {entry: [paragraph, toPath], line: null} as DragEntry,
          isTop: false,
          nestedGroup: null,
        }
      }
      if (Path.isAfter(fromPath, toPath) || Path.isAncestor(toPath, fromPath)) {
        isTop = true
      } else {
        isTop = false
      }
    }
    return {
      dragOverRef: {entry: [paragraph, toPath], line: null} as DragEntry,
      isTop,
      nestedGroup: null,
    }
  }
  return {
    dragOverRef: {entry: [node, toPath], line: null} as DragEntry,
    isTop: isTop,
    nestedGroup: null,
  }
}
