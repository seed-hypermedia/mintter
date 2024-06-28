import {
  HMAnnotations,
  HMBlock,
  HMBlockChildrenType,
  HMBlockCodeBlock,
  HMBlockFile,
  HMBlockHeading,
  HMBlockImage,
  HMBlockMath,
  HMBlockNode,
  HMBlockNostr,
  HMBlockParagraph,
  HMBlockVideo,
  HMBlockWebEmbed,
  HMInlineContent,
  HMInlineContentEmbed,
  HMInlineContentLink,
  HMStyles,
} from '../hm-types'
import {getCIDFromIPFSUrl} from '../utils'
import {Annotation} from './.generated/documents/v1alpha/documents_pb'
// import {Annotation, Block, BlockNode, HMTextAnnotation} from '@shm/shared'
// import {hmBlockSchema} from './schema'

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

function annotationStyle(a: Annotation): HMStyles {
  const annotation = a
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

export function toHMInlineContent(
  block: Partial<HMBlock>,
): Array<HMInlineContent> {
  const linkEmbedAndRangeAnnotations = block.annotations?.filter(
    (a) => a.type == 'link' || a.type == 'inline-embed' || a.type == 'range',
  )
  if (!linkEmbedAndRangeAnnotations?.length) {
    return partialBlockToStyledText(block)
  }

  // link annotations
  // link, embed, and range annotations
  if (
    linkEmbedAndRangeAnnotations.find((a) => {
      if (a.starts.length !== 1) return true
      if (a.ends.length !== 1) return true
    })
  ) {
    throw new Error(
      'Invalid link, embed, or range annotations in this block. Only one range per annotation is allowed',
    )
  }
  const sortedAnnotations = linkEmbedAndRangeAnnotations.sort(
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

  let annotationStart = sortedAnnotations[0].starts[0]
  const inlines: Array<HMInlineContent> = []
  inlines.push(...getSlicedContent(0, annotationStart))

  sortedAnnotations.forEach((a, aIndex) => {
    const length = a.ends[0] - a.starts[0]
    const annotationEnd = annotationStart + length

    if (a.type == 'link' || a.type == 'range') {
      inlines.push({
        type: a.type,
        href: a.ref,
        content: getSlicedContent(annotationStart, annotationEnd),
      } as HMInlineContentLink)
    } else if (a.type == 'inline-embed') {
      inlines.push({
        type: a.type,
        ref: a.ref,
      } as HMInlineContentEmbed)
    }

    const nonAnnotationContentEnd =
      sortedAnnotations[aIndex + 1]?.starts[0] || block.text.length
    inlines.push(...getSlicedContent(annotationEnd, nonAnnotationContentEnd))

    annotationStart = nonAnnotationContentEnd
  })
  return inlines
}

export function partialBlockToStyledText({
  text,
  annotations,
}: {
  text: string
  annotations: HMAnnotations
}) {
  if (!text) text = ''
  const stylesForIndex: (InternalAnnotation | null)[] = Array(text.length).fill(
    null,
  )
  const inlines: HMStyles[] = []
  const allStyleKeys = new Set<string>()

  annotations?.forEach((annotation) => {
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

export type ServerToEditorRecursiveOpts = {
  level?: number
}

function extractChildrenType(
  childrenType: string | undefined,
): HMBlockChildrenType {
  if (childrenType === 'ol') return 'ol'
  if (childrenType === 'ul') return 'ul'
  if (childrenType === 'blockquote') return 'blockquote'
  // console.warn(`Unknown childrenType block attr: ${childrenType}`)
  return 'group'
}

export function toHMBlockParagraph(
  serverBlock: HMBlockNode,
  opts: ServerToEditorRecursiveOpts,
): HMBlockParagraph {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock
  // let type: 'p' | 'code' | 'blockquote' = 'p'
  // if (opts?.paragraphType === 'code') type = 'code'
  // if (opts?.paragraphType === 'blockquote') type = 'blockquote'
  let childrenType = extractChildrenType(block.attributes?.childrenType)
  let result = {
    id: block.id,
    type: 'paragraph',
    content: toHMInlineContent(block),
    children: toHMBlock(children, {
      ...opts,
      childrenType,
    }),
    props: {
      childrenType,
    },
  }
  return result
}

export function toHMBlockHeading(
  serverBlock: HMBlockNode,
  opts?: ServerToEditorRecursiveOpts,
): HMBlockHeading {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock

  let res: HMBlockHeading = {
    type: 'heading',
    id: block.id,
    content: toHMInlineContent(block),
    children: toHMBlock(children, {
      level: (opts?.level || 0) + 1,
      childrenType: block.attributes?.childrenType as HMBlockChildrenType,
    }),
    props: {
      level: opts?.level || 1,
    },
  }

  return res
}

export function toHMBlockMath(
  serverBlock: HMBlockNode,
  opts?: ServerToEditorRecursiveOpts,
): HMBlockMath {
  if (!serverBlock.block) {
    throw new Error('Server BlockNode is missing Block data')
  }
  const {block, children} = serverBlock
  let childrenType = extractChildrenType(block.attributes?.childrenType)

  let res: HMBlockMath = {
    type: 'math',
    id: block.id,
    content: toHMInlineContent(block),
    children: toHMBlock(children, {
      ...opts,
      childrenType,
    }),
    props: {
      childrenType,
    },
  }

  return res
}

export function toHMBlock(
  content: HMBlockNode[] = [],
  opts: ServerToEditorRecursiveOpts & {
    childrenType?: HMBlockChildrenType
    listLevel?: string
    start?: string
  } = {level: 1},
): Array<HMBlock> {
  const childRecursiveOpts: ServerToEditorRecursiveOpts = {
    level: opts?.level || 0,
  }
  return content.map((serverBlock) => {
    let res: HMBlock | null = null
    if (serverBlock.block?.type == 'image') {
      res = {
        type: 'image',
        id: serverBlock.block.id,
        props: {
          url: serverBlock.block.ref,
          name: serverBlock.block.attributes?.name,
          width: serverBlock.block.attributes?.width,
          textAlignment: 'left',
          childrenType: extractChildrenType(
            serverBlock.block.attributes?.childrenType,
          ),
        },
        content: toHMInlineContent(serverBlock.block),
        children: [],
      } satisfies HMBlockImage
    }

    if (serverBlock.block?.type === 'file') {
      if (serverBlock.block.attributes?.subType?.startsWith('nostr:')) {
        res = {
          type: 'nostr',
          id: serverBlock.block.id,
          props: {
            url: getCIDFromIPFSUrl(serverBlock.block.ref),
            name: serverBlock.block.attributes?.name,
            size: serverBlock.block.attributes?.size,
            textAlignment: 'left',
            childrenType: extractChildrenType(
              serverBlock.block.attributes?.childrenType,
            ),
          },
          children: [],
        } satisfies HMBlockNostr
      } else {
        res = {
          type: 'file',
          id: serverBlock.block.id,
          props: {
            url: serverBlock.block.ref,
            name: serverBlock.block.attributes?.name,
            size: serverBlock.block.attributes?.size,
            textAlignment: 'left',
            childrenType: extractChildrenType(
              serverBlock.block.attributes?.childrenType,
            ),
          },
          children: [],
        } satisfies HMBlockFile
      }
    }

    if (serverBlock.block?.type === 'video') {
      res = {
        type: 'video',
        id: serverBlock.block.id,
        props: {
          url: serverBlock.block.ref,
          name: serverBlock.block.attributes?.name,
          width: serverBlock.block.attributes?.width,
          childrenType: extractChildrenType(
            serverBlock.block.attributes?.childrenType,
          ),
        },
        content: toHMInlineContent(serverBlock.block),
        children: [],
      } satisfies HMBlockVideo
    }

    if (serverBlock.block?.type === 'web-embed') {
      res = {
        type: 'web-embed',
        id: serverBlock.block.id,
        props: {
          url: serverBlock.block.ref,
          childrenType: extractChildrenType(
            serverBlock.block.attributes?.childrenType,
          ),
        },
        children: [],
      } satisfies HMBlockWebEmbed
    }

    if (serverBlock.block?.type === 'embed') {
      res = {
        type: 'embed',
        id: serverBlock.block.id,
        props: {
          url: serverBlock.block.ref,
          view: serverBlock.block.attributes.view || 'content',
          textAlignment: 'left',
          childrenType: extractChildrenType(
            serverBlock.block.attributes?.childrenType,
          ),
        },
        children: [],
      }
    }

    if (serverBlock.block?.type === 'codeBlock') {
      res = {
        type: 'codeBlock',
        id: serverBlock.block.id,
        props: {
          language: serverBlock.block.attributes.language,
          textAlignment: 'left',
          childrenType: extractChildrenType(
            serverBlock.block.attributes?.childrenType,
          ),
        },
        content: toHMInlineContent(serverBlock.block),
        children: [],
      } satisfies HMBlockCodeBlock
    }

    // how to handle when serverBlock.type is 'heading' but we are inside of a list?
    // for now, we prioritize the node type
    if (serverBlock.block?.type === 'heading') {
      res = toHMBlockHeading(serverBlock, childRecursiveOpts)
    }

    if (
      serverBlock.block?.type &&
      ['math', 'equation'].includes(serverBlock.block?.type)
    ) {
      res = toHMBlockMath(serverBlock, childRecursiveOpts)
    }
    // if (opts?.childrenType === 'numbers') {
    //   return serverBlockToEditorOLI(serverBlock, childRecursiveOpts)
    // }
    // if (opts?.childrenType === 'bullet') {
    //   return serverBlockToEditorULI(serverBlock, childRecursiveOpts)
    // }
    if (!res) {
      res = toHMBlockParagraph(serverBlock, childRecursiveOpts)
    }

    if (serverBlock.block?.attributes?.childrenType) {
      // @ts-expect-error
      res.props.childrenType = serverBlock.block.attributes.childrenType
    }

    if (serverBlock.block?.attributes?.start) {
      res.props.start = serverBlock.block.attributes.start
    }

    if (serverBlock.block?.attributes?.listLevel) {
      res.props.listLevel = serverBlock.block.attributes.listLevel
    }

    if (serverBlock.children?.length) {
      res.children = toHMBlock(serverBlock.children, {
        level: childRecursiveOpts.level ? childRecursiveOpts.level + 1 : 1,
      })
    }

    return res
  })
}
