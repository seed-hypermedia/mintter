import * as jspb from 'google-protobuf'
import {v4 as uuid} from 'uuid'
import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
  Document,
  // BlockRefList,
  BlockRef,
  BlockRefList,
} from '@mintter/proto/v2/documents_pb'
import {SlateBlock} from '../editor'
import {Node, Text} from 'slate'
import {
  ELEMENT_BLOCK_LIST,
  ELEMENT_BLOCK,
  ELEMENT_PARAGRAPH,
  ELEMENT_IMAGE,
} from '../elements'

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
    blocks: blockList.children.map(toBlockRef),
  })
}

export function toBlockRef(block: SlateBlock) {
  let ref: any = {}

  ref.id = block.id

  if (block.children.length > 1) {
    ref.blockRefList = toBlockRefList(block.children[1])
  }
  return makeProto(new BlockRef(), ref)
}

export interface EditorDocument {
  id?: string
  title: string
  subtitle?: string
  blocks: any[]
}

export interface ToDocumentRequestProp {
  editorDocument: EditorDocument
  author: string
  blockList: any // TODO: SlateBlock[]
}

export interface ToDocumentResponse {
  document: Document
  blocks: Block[]
}

export function toDocument({
  editorDocument,
  blockList,
  author,
}: ToDocumentRequestProp): ToDocumentResponse {
  const {blocks: tree, title, subtitle = '', id} = editorDocument
  // check if document has only one child
  if (tree.length > 1) {
    throw new Error(
      `toDocument: Invalid blocks lenght. it expects one child only and got ${tree.length}`,
    )
  }

  const rootBlockList = tree[0]
  // create blockRefList
  const blockRefList = toBlockRefList(rootBlockList)

  // create blocks
  const blocks = blockList.map(toBlock)

  // mix all together
  return {
    document: makeProto(new Document(), {
      id: id ?? uuid(),
      title,
      subtitle,
      author,
      blockRefList,
    }),
    blocks,
  }
}

// For some unreasonable reason protobuf compiler for JavaScript
// only exposes setters for each field, and no way to just pass an object.
// This is extremely painful to work with for many nested objects.
// It also for some more stupid reason appends "List" to the fields with Array values.
//
// This function attempts to convert a plain object into the given protobuf Message instance
// assuming these two inconveniences.
export function makeProto<T extends jspb.Message>(msg: T, data: {}): T {
  for (const [key, value] of Object.entries(data)) {
    let setter = `set${key.charAt(0).toUpperCase() + key.slice(1)}`

    if (Array.isArray(value)) {
      setter += 'List'
    }

    msg[setter](value)
  }

  return msg
}

export function toSlateBlock(block: Block): SlateBlock {
  const {id, paragraph, image}: Block.AsObject = block.toObject()

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
  blocks: Block[]
}

export function toSlateTree({blockRefList, blocks}: ToSlateTreeRequest) {
  const dictionary = toSlateBlocksDictionary(blocks)
  return {
    type: ELEMENT_BLOCK_LIST,
    listType: blockRefList.style,
    children: blockRefList.blocksList.map(child => {
      const block = dictionary[child.id]

      if (child.blockRefList) {
        block.children.push(
          toSlateTree({blockRefList: child.blockRefList, blocks}),
        )
      }

      return block
    }),
  }
}

export interface ToSlateBlocksDictionaryResponse {
  [key: string]: SlateBlock
}

export function toSlateBlocksDictionary(
  blocks: Block[],
): ToSlateBlocksDictionaryResponse {
  return blocks.reduce((acc, item) => {
    const block = item.toObject()

    // TODO: Guard for dulplicates?
    // TODO: Guard for transclusions?
    acc[block.id] = toSlateBlock(item)

    return acc
  }, {})
}
