import {ReactEditor} from 'slate-react'
import {Editor, Element, Node, Path, Transforms} from 'slate'
import {
  isBlockAboveEmpty,
  isSelectionAtBlockStart,
  onKeyDownResetBlockType,
  isCollapsed,
  deserializeHTMLToDocumentFragment,
  SlateDocumentDescendant,
} from '@udecode/slate-plugins'
import {getInlineTypes} from '@udecode/slate-plugins-core'
import {id} from '../id'
import {insertBlockItem} from './insert-block-item'
import {moveBlockItemUp} from './move-block-item-up'
import {
  getBlockItemEntry,
  isSelectionInBlockItem,
} from './is-selection-in-block-item'
import {unwrapBlockList} from './unwrap-blocklist'
import {avoidMultipleRootChilds} from './utils/avoid-multiple-rootchilds'
// import {avoidMultipleBlockChilds} from './utils/avoidMultipleBlockChilds'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'
import {ELEMENT_BLOCK} from '../block-plugin/defaults'
import {ELEMENT_BLOCK_LIST} from '../hierarchy-plugin/defaults'
import {BlockRefList} from '@mintter/api/v2/documents_pb'
import {removeRootListItem} from './utils/remove-root-block-item'
import {hasListInBlockItem} from './utils/has-list-in-block-item'
import {removeFirstBlockItem} from './utils/remove-first-block-item'
import {deleteListFragment} from './utils/delete-list-fragment'

interface MintterEditor {}

export const withMintter = ({plugins = [], options}) => <T extends ReactEditor>(
  editor: T,
) => {
  const e = editor as T & ReactEditor & MintterEditor
  const {p, block} = options
  const {
    insertBreak,
    deleteBackward,
    normalizeNode,
    deleteFragment,
    insertData,
  } = e

  const resetBlockTypesListRule = {
    types: [block.type],
    defaultType: p.type,
    onReset: (_editor: Editor) => unwrapBlockList(_editor, options),
  }

  e.insertBreak = () => {
    const res = isSelectionInBlockItem(e, options)

    let moved: boolean | undefined
    if (res && isBlockAboveEmpty(e)) {
      const {blockListNode, blockListPath, blockPath} = res
      moved = moveBlockItemUp(
        e,
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
          predicate: () => !moved && isBlockAboveEmpty(e),
        },
      ],
    })(null, e)
    if (didReset) return

    /**
     * Add a new list item if selection is in a LIST_ITEM > p.type.
     */
    if (!moved) {
      const inserted = insertBlockItem(e, options)
      if (inserted) return
    }

    insertBreak()
  }

  e.deleteBackward = unit => {
    const res = getBlockItemEntry({editor: e, locationOptions: {}, options})

    let moved: boolean | undefined

    if (res) {
      const {blockList, blockItem} = res
      const [blockItemNode] = blockItem

      if (isSelectionAtBlockStart(e)) {
        moved = removeFirstBlockItem(e, {blockList, blockItem}, options)
        if (moved) return

        moved = removeRootListItem(e, {blockList, blockItem}, options)
        if (moved) return

        moved = moveBlockItemUp(
          e,
          blockList[0],
          blockList[1],
          blockItem[1],
          options,
        )
        if (moved) return
      }

      if (hasListInBlockItem(blockItemNode) && isCollapsed(e.selection)) {
        return deleteBackward(unit)
      }
    }

    // const didReset = onKeyDownResetBlockType({
    //   rules: [
    //     {
    //       ...resetBlockTypesListRule,
    //       predicate: () => !moved && isBlockAboveEmpty(e),
    //     },
    //   ],
    // })(null, editor)
    // if (didReset) return

    deleteBackward(unit)
  }

  e.normalizeNode = entry => {
    const [node, path] = entry

    if (avoidMultipleRootChilds(e)) return

    if (Element.isElement(node)) {
      if (node.type === ELEMENT_PARAGRAPH) {
        for (const [child, childPath] of Node.children(e, path)) {
          if (Element.isElement(child) && !e.isInline(child)) {
            Transforms.unwrapNodes(e, {at: childPath})
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
          for (const [child, childPath] of Node.children(e, path)) {
            if (child.type === ELEMENT_PARAGRAPH) {
              console.log('=== BLOCK -> PARAGRAPH CHILD ', {
                child,
                childPath,
                length: childPath[childPath.length - 1] !== 0,
              })
              if (childPath[childPath.length - 1] !== 0) {
                Transforms.liftNodes(editor, {at: path.concat(0)})
                return
              }
            }

            if (child.type === ELEMENT_BLOCK_LIST) {
              if (childPath[childPath.length - 1] !== 1) {
                Editor.withoutNormalizing(e, () => {
                  Transforms.unwrapNodes(e, {at: path})
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
          Editor.withoutNormalizing(e, () => {
            Transforms.setNodes(
              e,
              {listType: BlockRefList.Style.BULLET},
              {at: path},
            )
          })
        }

        for (const [child, childPath] of Node.children(e, path)) {
          if (Element.isElement(child)) {
            if (child.type === ELEMENT_PARAGRAPH) {
              Transforms.wrapNodes(
                e,
                {
                  type: ELEMENT_BLOCK,
                  id: id(),
                  children: [],
                },
                {at: childPath},
              )

              return
            } else if (child.type === ELEMENT_BLOCK_LIST) {
              const prevChildPath = Path.previous(childPath)
              const prevChild: any = Node.get(e, prevChildPath)
              if (!prevChild) return
              if (prevChild.type === ELEMENT_BLOCK) {
                Transforms.moveNodes(e, {
                  at: childPath,
                  to: prevChildPath.concat(1),
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

  const {
    preInsert = fragment => {
      const inlineTypes = getInlineTypes(plugins)

      const firstNodeType = fragment[0].type as string | undefined

      // replace the selected node type by the first block type
      if (
        isBlockAboveEmpty(editor) &&
        firstNodeType &&
        !inlineTypes.includes(firstNodeType)
      ) {
        Transforms.setNodes(editor, {type: fragment[0].type})
      }

      return fragment
    },

    insert = fragment => {
      Transforms.insertFragment(editor, fragment)
    },
  } = options

  e.insertData = (data: DataTransfer) => {
    const html = data.getData('text/html')

    if (html) {
      const {body} = new DOMParser().parseFromString(html, 'text/html')
      let fragment = deserializeHTMLToDocumentFragment({
        plugins,
        element: body,
      })

      fragment = preInsert(fragment).map(orphanTextNodesToBlock())

      insert(fragment)
      return
    }

    insertData(data)
  }

  e.deleteFragment = () => {
    const {selection} = e

    if (selection && deleteListFragment(e, selection, options)) return

    deleteFragment()
  }

  return e
}

export const orphanTextNodesToBlock = (defaultType = 'p') => (
  node: SlateDocumentDescendant,
) => {
  if (node.type === undefined) {
    return {
      type: defaultType,
      children: [node],
    }
  }

  return node
}
