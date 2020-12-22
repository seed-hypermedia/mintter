import {ReactEditor} from 'slate-react'
import {Editor, Element, Node, Path, Transforms} from 'slate'
import {
  isBlockAboveEmpty,
  isSelectionAtBlockStart,
  onKeyDownResetBlockType,
  isCollapsed,
} from '@udecode/slate-plugins'
import {id} from '../id'
import {insertBlockItem} from './insertBlockItem'
import {moveBlockItemUp} from './moveBlockItemUp'
import {
  getBlockItemEntry,
  isSelectionInBlockItem,
} from './isSelectionInBlockItem'
import {unwrapBlockList} from './unwrapBlockList'
import {avoidMultipleRootChilds} from './utils/avoidMultipleRootChilds'
// import {avoidMultipleBlockChilds} from './utils/avoidMultipleBlockChilds'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_BLOCK} from '../BlockPlugin/defaults'
import {ELEMENT_BLOCK_LIST} from '../HierarchyPlugin/defaults'
import {BlockRefList} from '@mintter/api/v2/documents_pb'
import {removeRootListItem} from './utils/removeRootBlockItem'
import {hasListInBlockItem} from './utils/hasListInBlockItem'
import {removeFirstBlockItem} from './utils/removeFirstBlockItem'
import {deleteListFragment} from './utils/deleteListFragment'

export const withMintter = options => <T extends ReactEditor>(editor: T) => {
  const {p, block} = options
  const {insertBreak, deleteBackward, normalizeNode, deleteFragment} = editor

  const resetBlockTypesListRule = {
    types: [block.type],
    defaultType: p.type,
    onReset: (_editor: Editor) => unwrapBlockList(_editor, options),
  }

  editor.insertBreak = () => {
    let res = isSelectionInBlockItem(editor, options)

    let moved: boolean | undefined
    if (res && isBlockAboveEmpty(editor)) {
      const {blockListNode, blockListPath, blockPath} = res
      moved = moveBlockItemUp(
        editor,
        blockListNode,
        blockListPath,
        blockPath,
        options,
      )

      if (moved) return

      if (blockListPath.length === 1) return
    }

    const didReset = onKeyDownResetBlockType({
      rules: [
        {
          ...resetBlockTypesListRule,
          predicate: () => !moved && isBlockAboveEmpty(editor),
        },
      ],
    })(null, editor)
    if (didReset) return

    /**
     * Add a new list item if selection is in a LIST_ITEM > p.type.
     */
    if (!moved) {
      const inserted = insertBlockItem(editor, options)
      if (inserted) return
    }

    insertBreak()
  }

  editor.deleteBackward = unit => {
    const res = getBlockItemEntry({editor, locationOptions: {}, options})

    let moved: boolean | undefined

    if (res) {
      const {blockList, blockItem} = res
      const [blockItemNode] = blockItem

      if (isSelectionAtBlockStart(editor)) {
        moved = removeFirstBlockItem(editor, {blockList, blockItem}, options)
        if (moved) return

        moved = removeRootListItem(editor, {blockList, blockItem}, options)
        if (moved) return

        moved = moveBlockItemUp(
          editor,
          blockList[0],
          blockList[1],
          blockItem[1],
          options,
        )
        if (moved) return
      }

      if (hasListInBlockItem(blockItemNode) && isCollapsed(editor.selection)) {
        return deleteBackward(unit)
      }
    }

    // const didReset = onKeyDownResetBlockType({
    //   rules: [
    //     {
    //       ...resetBlockTypesListRule,
    //       predicate: () => !moved && isBlockAboveEmpty(editor),
    //     },
    //   ],
    // })(null, editor)
    // if (didReset) return

    deleteBackward(unit)
  }

  editor.normalizeNode = entry => {
    const [node, path] = entry

    if (avoidMultipleRootChilds(editor)) return

    if (Element.isElement(node)) {
      if (node.type === ELEMENT_PARAGRAPH) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child) && !editor.isInline(child)) {
            Transforms.unwrapNodes(editor, {at: childPath})
            return
          }
        }
      }

      if (node.type === ELEMENT_BLOCK) {
        // check if first child is a paragraph
        if (node.children.length === 1) {
          console.log('=== BLOCK -> ONLY 1 CHILD', {node, path})
        } else {
          console.log('=== BLOCK -> MORE CHILDSSS', {node, path})
          for (const [child, childPath] of Node.children(editor, path)) {
            if (child.type === ELEMENT_PARAGRAPH) {
              console.log('=== BLOCK -> PARAGRAPH CHILD ', {
                child,
                childPath,
                length: childPath[childPath.length - 1] !== 0,
              })
              if (childPath[childPath.length - 1] !== 0) {
                Editor.withoutNormalizing(editor, () => {
                  Transforms.insertNodes(
                    editor,
                    {type: ELEMENT_BLOCK, id: id(), children: [child]},
                    {at: Path.next(path)},
                  )
                  Transforms.removeNodes(editor, {at: childPath})
                })
                return
              }
            }

            if (child.type === ELEMENT_BLOCK_LIST) {
              if (childPath[childPath.length - 1] !== 1) {
                Editor.withoutNormalizing(editor, () => {
                  Transforms.unwrapNodes(editor, {at: path})
                })
                return
              }
            }
          }
        }
      }

      if (node.type === ELEMENT_BLOCK_LIST) {
        if (path.length === 1) {
          console.log('=== BLOCK_LIST -> ROOT')
        } else {
          Editor.withoutNormalizing(editor, () => {
            Transforms.setNodes(
              editor,
              {listType: BlockRefList.Style.BULLET},
              {at: path},
            )
          })
        }

        for (const [child, childPath] of Node.children(editor, path)) {
          if (Element.isElement(child)) {
            if (child.type === ELEMENT_PARAGRAPH) {
              Editor.withoutNormalizing(editor, () => {
                Transforms.wrapNodes(
                  editor,
                  {
                    type: ELEMENT_BLOCK,
                    id: id(),
                    children: [],
                  },
                  {at: childPath},
                )
              })
              return
            } else if (child.type === ELEMENT_BLOCK_LIST) {
              const prevChildPath = Path.previous(childPath)
              const prevChild: any = Node.get(editor, prevChildPath)
              if (!prevChild) return
              if (prevChild.type === ELEMENT_BLOCK) {
                Editor.withoutNormalizing(editor, () => {
                  Transforms.moveNodes(editor, {
                    at: childPath,
                    to: prevChildPath.concat(1),
                  })
                })
                return
              }
            }
          }
        }
      }
    }

    normalizeNode(entry)
  }

  editor.deleteFragment = () => {
    const {selection} = editor

    if (selection && deleteListFragment(editor, selection, options)) return

    deleteFragment()
  }

  return editor
}
