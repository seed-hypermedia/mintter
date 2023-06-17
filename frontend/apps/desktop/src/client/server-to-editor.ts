import {Annotation, Block, BlockNode, TextAnnotation} from '@mintter/shared'
import {InlineContent, PartialBlock, StyledText} from '@app/blocknote-core'
import {hdBlockSchema} from './schema'
import {s} from '@tauri-apps/api/event-2a9960e7'

function areStylesEqual(
  styles1: InternalAnnotation | null,
  styles2: InternalAnnotation | null,
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

type InternalAnnotation = Record<string, string | boolean>

function annotationStyle(a: Annotation): InternalAnnotation {
  const annotation: TextAnnotation = a as any //umm, hacks! I guess we should handle unknown annotations too
  if (annotation.type === 'emphasis') {
    return {italic: true}
  }
  if (annotation.type === 'strong') {
    return {bold: true}
  }
  if (annotation.type === 'underline') {
    return {underline: true}
  }
  if (annotation.type === 'code') {
    return {code: true}
  }
  return {}
}

export function serverBlockToEditorInline(block: Block): InlineContent[] {
  const linkAnnotations = block.annotations.filter((a) => a.type === 'link')
  if (!linkAnnotations.length) {
    return partialBlockToStyledText(block)
  }
  if (
    linkAnnotations.find((a) => {
      if (a.starts.length !== 1) return true
      if (a.ends.length !== 1) return true
    })
  ) {
    throw new Error(
      'Invalid link annotations in this block. only one range per annotation',
    )
  }
  const sortedLinkAnnotations = linkAnnotations.sort(
    (a, b) => a.starts[0] - b.starts[0],
  )

  function getSlicedContent(start: number, end: number) {
    return partialBlockToStyledText({
      text: block.text.slice(start, end),
      annotations: block.annotations.map((a) => {
        return new Annotation({
          ...a,
          starts: a.starts.map((s) => s - start),
          ends: a.ends.map((e) => e - start),
        })
      }),
    })
  }

  let linkStart = sortedLinkAnnotations[0].starts[0]
  const inlines: InlineContent[] = []
  inlines.push(...getSlicedContent(0, linkStart))

  sortedLinkAnnotations.forEach((a, aIndex) => {
    const length = a.ends[0] - a.starts[0]
    const linkEnd = linkStart + length

    inlines.push({
      type: 'link',
      href: a.ref,
      content: getSlicedContent(linkStart, linkEnd),
    })

    const nonLinkContentEnd =
      sortedLinkAnnotations[aIndex + 1]?.starts[0] || block.text.length
    inlines.push(...getSlicedContent(linkEnd, nonLinkContentEnd))

    linkStart = nonLinkContentEnd
  })

  return inlines
}

export function partialBlockToStyledText({
  text,
  annotations,
}: {
  text: string
  annotations: Annotation[]
}): StyledText[] {
  if (!text) text = ''
  const stylesForIndex: (InternalAnnotation | null)[] = Array(text.length).fill(
    null,
  )
  const inlines: StyledText[] = []
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

  if (currentText.length) {
    inlines.push({
      text: currentText,
      type: 'text',
      styles: currentStyles || {},
    })
  }

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

function getCIDFromIPFSUrl(url: string): string | null {
  const regex = /ipfs:\/\/(.+)/
  const match = url.match(regex)
  return match ? match[1] : null
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
    if (serverBlock.block?.type === 'image') {
      return {
        type: 'image',
        id: serverBlock.block.id,
        props: {
          url:
            getCIDFromIPFSUrl(serverBlock.block.ref) ||
            'bafybeihzo56er7wf7edzy7ihi5ncjvz2f46to45kgrxnv574ico3ofd7tu',
          alt: serverBlock.block.attributes.alt,
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
        },
      }
    }

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
