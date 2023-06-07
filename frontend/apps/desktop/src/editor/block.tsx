import {DraftBlocktools, PublicationBlocktools} from '@app/editor/blocktools'
import {EditorMode} from '@app/editor/plugin-utils'
import {useVisibleConnection} from '@app/editor/visible-connection'
import {useNavRoute} from '@app/utils/navigation'
import {
  createId,
  FlowContent,
  GroupingContent,
  isBlockquote,
  isCode,
  isContent,
  isEmbed,
  isFlowContent,
  isGroupContent,
  isHeading,
  isOrderedList,
  isPhrasingContent,
  isStatement,
  isStaticParagraph,
  Paragraph,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {Circle, SizableText, XStack, YStack} from '@mintter/ui'
import {Content} from 'hast'
import {useMemo, useState} from 'react'
import {
  Editor,
  Element,
  Node,
  NodeEntry,
  Path,
  Range,
  TextUnit,
  Transforms,
} from 'slate'
import {RenderElementProps, useSlateStatic} from 'slate-react'
import {removeEmptyGroup} from './group'
import {EditorHoveringActions} from './hovering-toolbar'
import {MintterEditor} from './mintter-changes/plugin'
import {ELEMENT_PARAGRAPH} from './paragraph'
import {EditorPlugin} from './types'
import {blockHasNestedGroup, BLOCK_GAP, findPath, isFirstChild} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

export const Block = (props: RenderElementProps & {mode: EditorMode}) => {
  if (props.mode == EditorMode.Draft) {
    return <DraftSection {...props} />
  }
  if (props.mode == EditorMode.Publication) {
    return <PublicationSection {...props} />
  }

  return props.children
}

const DraftSection = ({children, element, attributes}: RenderElementProps) => {
  let editor = useSlateStatic()
  let route = useNavRoute()
  let [hover, setHover] = useState(false)
  let [dropdownOpen, setDropDownOpen] = useState(false)
  // let {highlight} = useVisibleConnection((element as FlowContent).id)

  // let {blockProps, blockPath, parentNode} = useBlockProps(editor, element)
  let path = findPath(element)
  let parentNode = useMemo(() => {
    let parentEntry = Editor.above<GroupingContent>(editor, {
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })
    if (!parentEntry) return null
    return parentEntry[0]
  }, [path])

  let marker = useMemo(() => {
    if (parentNode?.type == 'orderedList') {
      // add number
      return {
        type: 'number' as const,
        index: path[path.length - 1] + 1,
      }
    } else if (parentNode?.type == 'unorderedList') {
      return {
        type: 'bullet' as const,
        level: path.length,
      }
    }
  }, [element])

  let height = useMemo(() => {
    if (isHeading(element)) {
      return 40
    }
    if (isBlockquote(element)) {
      return 44
    }

    if (isCode(element)) {
      return 64
    }

    return 32
  }, [element.type])

  return (
    <XStack
      {...attributes}
      gap="$2"
      // backgroundColor={
      //   route.key != 'draft' && highlight ? '$yellow3' : 'transparent'
      // }
      position={!dropdownOpen ? 'relative' : undefined}
    >
      <XStack
        //@ts-ignore
        contentEditable={false}
        position="absolute"
        top={0}
        left="-50%"
        width="200%"
        height="100%"
        onPointerEnter={!dropdownOpen ? () => setHover(true) : undefined}
        onPointerLeave={() => (!dropdownOpen ? setHover(false) : undefined)}
      />
      <XStack
        //@ts-ignore
        contentEditable={false}
        flex={0}
        flexShrink={0}
        flexGrow={0}
        width={32}
        height={height}
        alignItems="center"
        justifyContent="flex-end"
        onPointerEnter={!dropdownOpen ? () => setHover(true) : undefined}
        onPointerLeave={() => (!dropdownOpen ? setHover(false) : undefined)}
      >
        {hover ? (
          <DraftBlocktools
            editor={editor}
            current={[element as FlowContent, path]}
            onOpenChange={(isOpen) => {
              setDropDownOpen(isOpen)
              if (!isOpen) setHover(false)
            }}
            open={dropdownOpen}
          />
        ) : null}
      </XStack>
      {marker && (
        <Marker
          {...marker}
          start={isOrderedList(parentNode) ? parentNode.start : undefined}
          height={height}
        />
      )}

      <YStack flex={1} gap={BLOCK_GAP}>
        {children}
      </YStack>
    </XStack>
  )
}

const PublicationSection = ({
  children,
  element,
  attributes,
}: RenderElementProps) => {
  const editor = useSlateStatic()
  let {highlight} = useVisibleConnection((element as FlowContent).id)
  let [hover, setHover] = useState(false)
  //@ts-ignore
  // let {blockProps, blockPath, parentNode} = useBlockProps(element)

  let path = findPath(element)

  let parentNode = useMemo(() => {
    let parentEntry = editor.above<GroupingContent>({
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })
    if (!parentEntry) return null
    return parentEntry[0]
  }, [path])

  let marker = useMemo(() => {
    if (parentNode?.type == 'orderedList') {
      // add number
      return {
        type: 'number' as const,
        index: path[path.length - 1] + 1,
      }
    } else if (parentNode?.type == 'unorderedList') {
      return {
        type: 'bullet' as const,
        level: path.length,
      }
    }
  }, [element])

  let height = useMemo(() => {
    if (isHeading(element)) {
      return 40
    }
    if (isBlockquote(element)) {
      return 44
    }

    if (isCode(element)) {
      return 64
    }

    return 32
  }, [element.type])

  return (
    <XStack
      {...attributes}
      gap="$2"
      backgroundColor={highlight ? '$yellow3' : 'transparent'}
      position="relative"
    >
      <XStack
        position="absolute"
        top={0}
        left="-50%"
        width="200%"
        height="100%"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      />
      <XStack
        //@ts-ignore
        contentEditable={false}
        flex={0}
        flexShrink={0}
        flexGrow={0}
        width={32}
        height={height}
        alignItems="center"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        justifyContent="flex-end"
      ></XStack>
      {marker && (
        <Marker
          {...marker}
          start={isOrderedList(parentNode) ? parentNode.start : undefined}
          height={height}
        />
      )}
      <YStack
        flex={1}
        gap={BLOCK_GAP}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {children}
      </YStack>
      <XStack
        minHeight={height}
        alignItems="center"
        //@ts-ignore
        contentEditable={false}
        position="absolute"
        right={-40}
        flexShrink={0}
        flexGrow={0}
        width={32}
        height={height}
        justifyContent="flex-start"
        gap="$2"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        // borderColor="red"
        // borderWidth={1}
      >
        {hover ? (
          <PublicationBlocktools current={[element as FlowContent, path]} />
        ) : null}
      </XStack>
    </XStack>
  )
}

type MarkerProps = {
  type: 'bullet' | 'number'
  level?: number
  index?: number
  start?: number
  height: number
}

function Marker(props: MarkerProps) {
  const index = useMemo(() => {
    let idx = props.index ?? 1
    return props.start ? Number(props.start) + idx - 1 : idx
  }, [props.start, props.index])
  return (
    <XStack
      flex={0}
      flexShrink={0}
      flexGrow={0}
      width={32}
      height={props.height || 32}
      alignItems="center"
      justifyContent="center"
      // borderColor="yellow"
      // borderWidth={1}
      //@ts-ignore
      contentEditable={false}
      userSelect="none"
    >
      {props.type == 'bullet' ? (
        <Circle size={6} backgroundColor="$color" />
      ) : props.type == 'number' ? (
        <SizableText size="$1" color="$color">
          {index}.
        </SizableText>
      ) : null}
    </XStack>
  )
}

export function withBlocks(editor: Editor) {
  /**
   * cases to handle
   * - when enter, create a new block
   * - when backspace in the beginning of a block, remove block and merge paragraph with the previous
   */

  const {normalizeNode, insertBreak, deleteBackward} = editor

  editor.deleteBackward = function blockDeleteBackward(unit: TextUnit) {
    console.log('blockDeleteBackward', editor.selection)
    if (resetEmptyBlock(editor)) return
    deleteBackward(unit)
  }

  editor.insertBreak = function blockInsertBreak() {
    if (collapsedNestedInsertBreak(editor)) return
    if (collapsedInsertBreak(editor)) return
    if (nonCollapsedInsertBreak(editor)) return

    insertBreak()
  }

  editor.normalizeNode = function blockNormalizeNode(entry) {
    const [node, path] = entry

    if (Element.isElement(node) && isGroupContent(node)) {
      if (removeEmptyGroup(editor, entry)) return

      for (const [child, childPath] of Node.children(editor, path)) {
        // addParentData(editor, entry)

        // This rule is concerned with groups that are children of other groups
        // this happens when pasting nested lists from html and we want to explicitly handle it
        // this rule moves a group into the previous statement or unwraps it
        if (isGroupContent(child)) {
          if (isFirstChild(childPath)) {
            editor.unwrapNodes({at: childPath})
          } else {
            const [prev, prevPath] =
              editor.previous({
                at: childPath,
              }) || []

            if (prev && prevPath && isFlowContent(prev)) {
              if (isGroupContent(prev.children[1])) {
                // we already have a group
                editor.unwrapNodes({at: childPath})
              } else {
                // we don't have a group

                editor.moveNodes({
                  at: childPath,
                  to: prevPath.concat(1),
                })
              }
            } else {
              editor.unwrapNodes({at: childPath})
            }
          }

          return
        }

        if (!isFlowContent(child)) {
          // inside group and not a flowcontent
          let blockId = createId()

          editor.wrapNodes(statement({id: blockId}), {
            at: childPath,
          })
          MintterEditor.addChange(editor, ['moveBlock', blockId])
          MintterEditor.addChange(editor, ['replaceBlock', blockId])
          return
        }
      }
    }

    normalizeNode(entry)
  }

  return editor
}

function collapsedNestedInsertBreak(editor: Editor) {
  if (!editor.selection) {
    console.warn('collapsedNestedInsertBreak: no editor selection')
    return false
  }

  // need to get the current paragraph content entry
  const content = editor.above({
    match: isContent,
  })

  if (!content) {
    console.warn('collapsedNestedInsertBreak: no paragraph above')
    return false
  }

  let [cNode, cPath] = content

  if (cPath.length > 3) {
    // this means that the current block is not at the root level, so we should check hte content to see if we need to lift or not
    if (isContentEmpty(content)) {
      // the content block (paragraph or staticparagraph) is empty and does not have any embed
      let blockPath = Path.parent(cPath)
      // let currentBlock = Node.get(editor, blockPath)
      let parentEntry = editor.above({
        match: isFlowContent,
        mode: 'lowest',
        at: blockPath,
      })
      if (!parentEntry) {
        console.warn('collapsedNestedInsertBreak: no parent Block above')
        return false
      }
      let [pBlock, pPath] = parentEntry

      // now the list reset is restricted to just the last child of the nested list.
      // we should be able to do this with internal elements, but we need to make sure we reparent all the above elements to the current lifted block
      if (!childBlockIsLast(blockPath, pBlock)) return false

      // move the current nested block next to its parent
      editor.moveNodes({
        at: blockPath,
        to: Path.next(pPath),
      })
      return true
    }
  }
  return false
}

function isContentEmpty(entry?: NodeEntry<Paragraph>): boolean {
  if (!entry) return false
  let [cNode] = entry
  if (Node.string(cNode) == '') {
    if (!cNode.children.some(isEmbed)) {
      return true
    } else {
      return false
    }
  }
  return false
}

function childBlockIsLast(blockPath: Path, parent: FlowContent): boolean {
  let childList = parent.children[1]

  if (childList) {
    return blockPath[blockPath.length - 1] == childList?.children.length - 1
  }
  return false
}

function collapsedInsertBreak(editor: Editor) {
  if (!editor.selection) {
    console.warn('collapsedInsertBreak: no editor selection')
    return false
  }

  // need to get the current paragraph content entry
  const content = editor.above({
    match: isContent,
  })

  if (!content) {
    console.warn('blockInsertBreak: no paragraph above')
    return false
  }

  let [cNode, cPath] = content

  try {
    // using a try/catch because getting paths that does not exists breaks the editor
    // get the current block path
    let blockPath = Path.parent(cPath)
    let currentBlock = Node.get(editor, blockPath)

    if (!isFlowContent(currentBlock)) return false

    if (isCode(currentBlock)) {
      editor.insertText('\n')
      return true
    }

    // get the next position of the current block. if the currentBlock has children, then the next position is the first child of the nested group. otherwise is the next currentBlock's position
    // we add `2, 0` to the path because we splitted the first chidld of the block, which means that everything was shifted 1 path to the right
    let targetPath = blockHasNestedGroup(currentBlock)
      ? [...blockPath, 2, 0]
      : Path.next(blockPath)

    // get the next position of the splitted content
    let splittedP = Path.next(cPath)

    editor.withoutNormalizing(() => {
      // split the content (this is what slate does normally when `insertBreak` - https://github.com/ianstormtaylor/slate/blob/main/packages/slate/src/editor/insert-break.ts#L5)
      editor.splitNodes({always: true})
      if (isStaticParagraph(cNode)) {
        editor.setNodes({type: ELEMENT_PARAGRAPH}, {at: splittedP})
      }

      // wrap the new content into a new block
      let newBlock = statement({id: createId()})
      editor.wrapNodes(newBlock, {at: splittedP})

      // move the new block to the targetPath (the next position of the current block)
      editor.moveNodes({at: splittedP, to: targetPath})
    })
    return true
  } catch (error) {
    return false
  }
}

function nonCollapsedInsertBreak(editor: Editor) {
  if (!editor.selection) {
    console.warn('nonCollapsedInsertBreak: no editor selection')
    return false
  }

  if (!Range.isCollapsed(editor.selection)) {
    // if the user has some text selected and press enter:
    // - we remove the fragment selected
    // - perform a normal insertBreak

    editor.withoutNormalizing(() => {
      editor.deleteFragment()
    })

    return true
  }
  return false
}

export function deleteBackwardKeydown(
  editor: Editor,
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.defaultPrevented) return false
  if (event.key == 'Backspace') {
    event.preventDefault()
    // need to get the current paragraph content entry
    // TODO: handle backspace when selection is in the beginning
    console.warn(
      'deleteBackwardKeydown: TODO: handle backspace when selection is in the beginning',
    )

    return true
  }
  return false
}

function resetEmptyBlock(editor: Editor): boolean {
  if (!editor.selection) {
    console.warn('resetEmptyBlock: no editor selection')
    return false
  }

  let blockEntry = editor.above({
    match: isFlowContent,
    mode: 'lowest',
  })

  if (!blockEntry) {
    console.warn('resetEmptyBlock: no flowContent above')
    return false
  }
  console.log(
    '🚀 ~ file: block.tsx:576 ~ resetEmptyBlock ~ resetEmptyBlock:',
    blockEntry[0],
  )
  // check if the current block is not type statement (default)
  if (isStatement(blockEntry[0])) return false

  let [bNode, bPath] = blockEntry

  let content = editor.node([...bPath, 0])
  // @ts-ignore check if block is empty
  if (!isContentEmpty(content)) return false

  // block should not be statement and it is empty at this point.
  let newBlock = statement({id: bNode.id}, [paragraph([text('')])])

  editor.withoutNormalizing(() => {
    editor.removeNodes({
      at: bPath,
    })
    editor.insertNode(newBlock, {at: bPath})
    Transforms.select(editor, bPath)
  })
  return true
}
