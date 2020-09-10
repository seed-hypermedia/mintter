import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
  // Document,
  // BlockRefList,
  BlockRef,
  BlockRefList,
  Document,
} from '@mintter/proto/v2/documents_pb'
import {SlateBlock} from '../editor'
import {Node, Text} from 'slate'
import {ELEMENT_PARAGRAPH} from '../elements'
import {ELEMENT_BLOCK} from '../BlockPlugin'
import {ELEMENT_IMAGE} from '../ImagePlugin'
import {ELEMENT_BLOCK_LIST} from '../HierarchyPlugin'
import {makeProto} from './makeProto'
import {v4 as uuid} from 'uuid'

export function toBlock(node: SlateBlock): Block {
  const pNode: Node = node.children.filter(n => n.type === 'p')[0]
  const pChildren = pNode.children as any
  return makeProto(new Block(), {
    id: node.id,
    paragraph: makeProto(new Paragraph(), {
      inlineElements: pChildren.map(toInlineElement),
    }),
  })
}

export function toInlineElement({text, ...textStyles}: Text): InlineElement {
  let newInlineElement: any = {
    text,
  }

  if (Object.entries(textStyles).length > 0) {
    newInlineElement.textStyle = makeProto(new TextStyle(), textStyles)
  }

  return makeProto(new InlineElement(), newInlineElement)
}

export function toBlockRefList(blockList) {
  if (blockList.type !== ELEMENT_BLOCK_LIST) {
    throw new Error(
      `toBlockRefList: the node passed should be of type "block_list" but got ${blockList.type}`,
    )
  }

  return makeProto(new BlockRefList(), {
    style: blockList.listType,
    refs: blockList.children.map(toBlockRef),
  })
}

export function toBlockRef(block: SlateBlock) {
  let newRef: any = {}

  newRef.ref = block.id

  if (block.children.length > 1) {
    newRef.blockRefList = toBlockRefList(block.children[1])
  }
  return makeProto(new BlockRef(), newRef)
}

export interface EditorDocument {
  version: string
  title: string
  subtitle: string
  blocks: any[]
}

export interface ToDocumentRequestProp {
  document: {
    id: string
    version: string | string[]
    author: string
  }
  state: {
    title: string
    subtitle: string
    blocks: SlateBlock[]
  }
}

export function toDocument({document, state}: ToDocumentRequestProp): Document {
  // check if document has only one child
  if (state.blocks.length > 1) {
    throw new Error(
      `toDocument: Invalid blocks lenght. it expects one child only and got ${state.blocks.length}`,
    )
  }

  // const {title, subtitle, blocks: editorTree} = state
  const {title, subtitle, blocks: editorTree} = state
  const {id, version, author} = document

  const rootBlockList = editorTree[0]
  // create blockRefList
  const blockRefList = toBlockRefList(rootBlockList)

  // mix all together

  return makeProto(new Document(), {
    id,
    version,
    title,
    subtitle,
    author,
    blockRefList,
  })
}

export function toSlateBlock({
  id,
  paragraph,
  image,
}: Block.AsObject): SlateBlock {
  let slateBlock = {
    id,
    type: ELEMENT_BLOCK,
  }

  if (image) {
    return {
      ...slateBlock,
      children: [
        {
          type: ELEMENT_IMAGE,
          url: image.url,
          alt: image.altText,
          children: [{text: ''}],
        },
      ],
    }
  }

  return {
    ...slateBlock,
    children: [
      {
        type: ELEMENT_PARAGRAPH,
        children: paragraph
          ? paragraph.inlineElementsList.map(({text, textStyle = {}}) => ({
              text,
              ...textStyle,
            }))
          : [{text: ''}],
      },
    ],
  }
}

export interface ToSlateTreeRequest {
  blockRefList: BlockRefList.AsObject
  blocksMap: Array<[string, Block.AsObject]>
  isRoot?: boolean
}

export function toSlateTree({
  blockRefList,
  blocksMap,
  isRoot = false,
}: ToSlateTreeRequest) {
  if (!blockRefList) return
  console.log('toSlateTree -> blockRefList', blockRefList)
  const dictionary = toSlateBlocksDictionary(blocksMap)
  const blocks = {
    type: ELEMENT_BLOCK_LIST,
    id: uuid(),
    listType: blockRefList.style,
    children: blockRefList.refsList.map(child => {
      const block = dictionary[child.ref]

      if (child.blockRefList) {
        block.children.push(
          toSlateTree({blockRefList: child.blockRefList, blocksMap}),
        )
      }

      return block
    }),
  }
  return isRoot ? [blocks] : blocks
}

export interface ToSlateBlocksDictionaryResponse {
  [key: string]: SlateBlock
}

export function toSlateBlocksDictionary(
  blocksMap: Array<[string, Block.AsObject]>,
): ToSlateBlocksDictionaryResponse {
  let blocks = {}

  for (let [id, block] of blocksMap) {
    blocks[id] = toSlateBlock(block)
  }

  console.log('toSlateBlocksDictionary', blocks)
  return blocks
  // return blocksMap.reduce((acc, item) => {
  //   const block = item.toObject()

  //   // TODO: Guard for dulplicates?
  //   // TODO: Guard for transclusions?
  //   acc[block.id] = toSlateBlock(item)

  //   return acc
  // }, {})
}
