import {getCIDFromIPFSUrl} from '../utils'
import {
  Annotation,
  Block,
  BlockNode,
} from './.generated/documents/v1alpha/documents_pb'
import {EditorBlock, InlineContent, StyledText} from './editor-types'
import {HDBlockChildrenType, TextAnnotation} from './hyperdocs-presentation'
// import {Annotation, Block, BlockNode, TextAnnotation} from '@mintter/shared'
// import {hdBlockSchema} from './schema'

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
  if (annotation.type === 'strike') {
    return {strike: true}
  }
  if (annotation.type === 'code') {
    return {code: true}
  }

  // if (annotation.type === 'embed') {
  //   return {embed: annotation.ref}
  // }
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
      // @ts-expect-error
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
}): InlineContent[] {
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

export type EditorChildrenType = HDBlockChildrenType

export type ServerToEditorRecursiveOpts = {
  headingLevel: number
}

function extractChildrenType(
  childrenType: string | undefined,
): EditorChildrenType {
  if (!childrenType) return 'group'
  if (childrenType === 'ol') return 'ol'
  if (childrenType === 'ul') return 'ul'
  if (childrenType === 'blockquote') return 'blockquote'
  throw new Error('Unknown childrenType block attr: ' + childrenType)
}

export function serverBlockNodeToEditorParagraph(
  serverBlock: BlockNode,
  opts: ServerToEditorRecursiveOpts,
): EditorBlock {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock
  // let type: 'p' | 'code' | 'blockquote' = 'p'
  // if (opts?.paragraphType === 'code') type = 'code'
  // if (opts?.paragraphType === 'blockquote') type = 'blockquote'
  return {
    id: block.id,
    type: 'paragraph',
    content: serverBlockToEditorInline(block),
    children: serverChildrenToEditorChildren(children, {
      ...opts,
      // childrenType: extractChildrenType(block.attributes.childrenType),
      childrenType: block.attributes.childrenType as HDBlockChildrenType,
    }),
    props: {
      type: serverBlock.block.attributes.type as 'p',
    },
  }
}

export function serverBlockToHeading(
  serverBlock: BlockNode,
  opts?: ServerToEditorRecursiveOpts,
): EditorBlock {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock
  return {
    type: 'heading',
    id: block.id,
    content: serverBlockToEditorInline(block),
    children: serverChildrenToEditorChildren(children, {
      headingLevel: (opts?.headingLevel || 0) + 1,
      childrenType: extractChildrenType(block.attributes.childrenType),
    }),
    props: {
      level: '2',
    },
  }
}

export function serverChildrenToEditorChildren(
  children: BlockNode[],
  opts?: ServerToEditorRecursiveOpts & {
    childrenType?: EditorChildrenType
    start?: string
  },
): EditorBlock[] {
  const childRecursiveOpts: ServerToEditorRecursiveOpts = {
    headingLevel: opts?.headingLevel || 0,
  }
  return children.map((serverBlock) => {
    let res: EditorBlock | null = null
    if (serverBlock.block?.type === 'image') {
      res = {
        type: 'image',
        id: serverBlock.block.id,
        props: {
          url: getCIDFromIPFSUrl(serverBlock.block.ref) || '',
          name: serverBlock.block.attributes.name,
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
          defaultOpen: 'false',
        },
        content: serverBlockToEditorInline(serverBlock.block),
        children: serverChildrenToEditorChildren(serverBlock.children),
      }
    }

    if (serverBlock.block?.type === 'file') {
      res = {
        type: 'file',
        id: serverBlock.block.id,
        props: {
          url: getCIDFromIPFSUrl(serverBlock.block.ref) || '',
          name: serverBlock.block.attributes.name,
          size: serverBlock.block.attributes.size,
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
          defaultOpen: 'false',
        },
        children: serverChildrenToEditorChildren(serverBlock.children),
      }
    }

    if (serverBlock.block?.type === 'video') {
      res = {
        type: 'video',
        id: serverBlock.block.id,
        props: {
          url: getCIDFromIPFSUrl(serverBlock.block.ref) || '',
          name: serverBlock.block.attributes.name,
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
          defaultOpen: 'false',
        },
        content: serverBlockToEditorInline(serverBlock.block),
        children: serverChildrenToEditorChildren(serverBlock.children),
      }
    }

    if (serverBlock.block?.type === 'embed') {
      res = {
        type: 'embed',
        id: serverBlock.block.id,
        props: {
          ref: serverBlock.block.ref,
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
        },
        children: serverChildrenToEditorChildren(serverBlock.children),
      }
    }

    // how to handle when serverBlock.type is 'heading' but we are inside of a list?
    // for now, we prioritize the node type
    if (serverBlock.block?.type === 'heading') {
      res = serverBlockToHeading(serverBlock, childRecursiveOpts)
    }
    // if (opts?.childrenType === 'numbers') {
    //   return serverBlockToEditorOLI(serverBlock, childRecursiveOpts)
    // }
    // if (opts?.childrenType === 'bullet') {
    //   return serverBlockToEditorULI(serverBlock, childRecursiveOpts)
    // }
    if (!res) {
      res = serverBlockNodeToEditorParagraph(serverBlock, childRecursiveOpts)
    }

    if (serverBlock.block?.attributes.childrenType) {
      // @ts-expect-error
      res.props.childrenType = serverBlock.block.attributes.childrenType
    }

    if (serverBlock.block?.attributes.start) {
      res.props.start = serverBlock.block.attributes.start
    }

    return res
  })
}
