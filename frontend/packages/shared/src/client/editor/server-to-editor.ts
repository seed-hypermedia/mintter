import {
  BlockSchema,
  BlockSpec,
  InlineContent,
  PartialBlock,
} from '@blocknote/core'
import {
  Annotation,
  Block,
  BlockNode,
} from '../.generated/documents/v1alpha/documents_pb'
import {TextAnnotation} from './hyperdocs-presentation'
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

function annotationStyle(a: Annotation): Record<string, string> {
  const annotation: TextAnnotation = a as any //umm, hacks! I guess we should handle unknown annotations too
  if (a.type === 'emphasis') {
    return {italic: 'true'}
  }
  if (a.type === 'strong') {
    return {bold: 'true'}
  }
  if (a.type === 'underline') {
    return {underline: 'true'}
  }
  if (a.type === 'code') {
    return {code: 'true'}
  }
  return {}
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
    const {starts, ends} = annotation
    const annotationStyles = annotationStyle(annotation)
    Object.keys(annotationStyles).forEach((key) => allStyleKeys.add(key))
    starts.forEach((start, index) => {
      const end = ends[index]
      for (let i = start; i < end; i++) {
        stylesForIndex[i] = {
          ...(stylesForIndex[i] || {}),
          ...annotationStyles,
        }
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

export function serverBlockNodeToEditorParagraph(
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
    return serverBlockNodeToEditorParagraph(serverBlock)
  })
}
