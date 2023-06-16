import {Annotation, Block, BlockNode, TextAnnotation} from '@mintter/shared'
import {InlineContent, PartialBlock} from '@app/blocknote-core'
import {hdBlockSchema} from './schema'

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
  if (annotation.type === 'emphasis') {
    return {italic: 'true'}
  }
  if (annotation.type === 'strong') {
    return {bold: 'true'}
  }
  if (annotation.type === 'underline') {
    return {underline: 'true'}
  }
  if (annotation.type === 'code') {
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

  let currentText = text[0] || ''
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

type ChildrenType = 'group' | 'numbers' | 'bullet' | 'blockquote'

type RecursiveOpts = {
  headingLevel: number
}

function extractChildrenType(childrenType: string | undefined): ChildrenType {
  if (!childrenType) return 'group'
  if (childrenType === 'numbers') return 'numbers'
  if (childrenType === 'bullet') return 'bullet'
  if (childrenType === 'blockquote') return 'blockquote'
  throw new Error('Unknown childrenType block attr: ' + childrenType)
}

export function serverBlockNodeToEditorParagraph(
  serverBlock: BlockNode,
  opts: RecursiveOpts,
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
      ...opts,
      childrenType: extractChildrenType(block.attributes.childrenType),
    }),
    props: {},
  }
}

export function serverBlockToHeading(
  serverBlock: BlockNode,
  opts?: RecursiveOpts,
): PartialBlock<typeof hdBlockSchema> {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock
  let level: '3' | '2' | '1' = '3'
  if (opts?.headingLevel === 0) level = '1'
  if (opts?.headingLevel === 1) level = '2'
  return {
    type: 'heading',
    id: block.id,
    content: serverBlockToEditorInline(block),
    children: serverChildrenToEditorChildren(children, {
      headingLevel: (opts?.headingLevel || 0) + 1,
      childrenType: extractChildrenType(block.attributes.childrenType),
    }),
    props: {
      level,
    },
  }
}

export function serverChildrenToEditorChildren(
  children: BlockNode[],
  opts?: RecursiveOpts & {
    childrenType?: ChildrenType
  },
): PartialBlock<typeof hdBlockSchema>[] {
  const childRecursiveOpts: RecursiveOpts = {
    headingLevel: opts?.headingLevel || 0,
  }
  return children.map((serverBlock) => {
    // how to handle when serverBlock.type is 'heading' but we are inside of a list?
    // for now, we prioritize the node type
    if (serverBlock.block?.type === 'heading') {
      return serverBlockToHeading(serverBlock, childRecursiveOpts)
    }
    // if (opts?.childrenType === 'numbers') {
    //   return serverBlockToEditorOLI(serverBlock, childRecursiveOpts)
    // }
    // if (opts?.childrenType === 'bullet') {
    //   return serverBlockToEditorULI(serverBlock, childRecursiveOpts)
    // }

    return serverBlockNodeToEditorParagraph(serverBlock, childRecursiveOpts)
  })
}
