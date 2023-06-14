import {
  BlockSchema,
  BlockSpec,
  InlineContent,
  PartialBlock,
} from '@blocknote/core'
import {Block, BlockNode} from '../.generated/documents/v1alpha/documents_pb'
import {hdBlockSchema} from './schema'

export function leafServerBlockToEditorBlock(block: Block): PartialBlock<any> {
  return {
    id: block.id,
    type: 'text',
    // @ts-expect-error
    text: block.text,
    style: {},
  }
}

type Inline = {
  text: string
  styles: Record<string, string>
}

function areStylesEqual(
  styles1: Record<string, string> | null,
  styles2: Record<string, string> | null,
  keys: Set<string>,
): boolean {
  if (styles1 === null && styles2 === null) return true
  if (styles1 === null || styles2 === null) return false

  for (let key of keys) {
    if (styles1[key] !== styles2[key]) {
      return false
    }
  }

  return true
}

export function serverBlockToEditorInline(block: Block): InlineContent[] {
  let {text, annotations} = block
  if (!text) text = ''
  const stylesForIndex: (Record<string, string> | null)[] = Array(
    text.length,
  ).fill(null)
  const inlines: InlineContent[] = []
  const allStyleKeys = new Set<string>()

  annotations.forEach((annotation) => {
    const {starts, ends, attributes} = annotation
    Object.keys(attributes).forEach((key) => allStyleKeys.add(key))
    starts.forEach((start, index) => {
      const end = ends[index]
      for (let i = start; i < end; i++) {
        stylesForIndex[i] = {...(stylesForIndex[i] || {}), ...attributes}
      }
    })
  })

  let currentText = text[0]
  let currentStyles = stylesForIndex[0]

  for (let i = 1; i < text.length; i++) {
    if (areStylesEqual(stylesForIndex[i], currentStyles, allStyleKeys)) {
      currentText += text[i]
    } else {
      inlines.push({
        text: currentText,
        type: 'text',
        styles: currentStyles || {},
      })
      currentText = text[i]
      currentStyles = stylesForIndex[i]
    }
  }

  inlines.push({
    text: currentText,
    type: 'text',
    styles: currentStyles || {},
  })

  return inlines
}

type ChildrenType = null | 'ordered' | 'unordered' | 'blockquote'

function extractChildrenType(childrenType: string | undefined): ChildrenType {
  if (!childrenType) return null
  if (childrenType === 'ordered') return 'ordered'
  if (childrenType === 'unordered') return 'unordered'
  if (childrenType === 'blockquote') return 'blockquote'
  throw new Error('Unknown childrenType block attr: ' + childrenType)
}

export function serverBlockToEditorParagraph(
  serverBlock: BlockNode,
): PartialBlock<typeof hdBlockSchema> {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }

  const {block, children} = serverBlock
  return {
    id: block.id,
    type: 'paragraph',
    content: serverBlockToEditorInline(block),
    children: serverChildrenToEditorChildren(children, {
      childrenType: extractChildrenType(block.attributes.childrenType),
    }),
    props: {},
  }
}

export function serverBlockToEditorOLI(
  serverBlock: BlockNode,
): PartialBlock<typeof hdBlockSchema> {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }

  const {block, children} = serverBlock
  return {
    id: block.id,
    type: 'numberedListItem',
    content: serverBlockToEditorInline(block),
    children: serverChildrenToEditorChildren(children, {
      childrenType: extractChildrenType(block.attributes.childrenType),
    }),
    props: {},
  }
}

export function serverChildrenToEditorChildren(
  children: BlockNode[],
  opts?: {
    childrenType?: ChildrenType
  },
): PartialBlock<typeof hdBlockSchema>[] {
  return children.map((serverBlock) => {
    if (opts?.childrenType === 'ordered') {
    }
    return serverBlockToEditorParagraph(serverBlock)
  })
}
