import * as jspb from 'google-protobuf'
import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
} from '@mintter/proto/v2/documents_pb'
import {Node, Text} from 'slate'

interface SlateBlock {
  id: string
  type: string
  children: Node[]
}

export function toBlock(node: SlateBlock): Block {
  const pNode: Node = node.children.filter(n => n.type === 'p')[0]
  const pChildren = pNode.children as any
  return makeProto(new Block(), {
    id: node.id,
    paragraph: makeProto(new Paragraph(), {
      inlineElements: pChildren.map(({text, ...textStyles}: Text) => {
        let newInlineElement: any = {
          text,
        }

        if (Object.entries(textStyles).length > 0) {
          newInlineElement.textStyle = makeProto(new TextStyle(), textStyles)
        }

        return makeProto(new InlineElement(), newInlineElement)
      }),
    }),
  })
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
    let setter = 'set' + key.charAt(0).toUpperCase() + key.slice(1)

    if (Array.isArray(value)) {
      setter += 'List'
    }

    msg[setter](value)
  }

  return msg
}
