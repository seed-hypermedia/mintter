import {
  Block as EditorBlock,
  Styles,
  hmBlockSchema,
} from '@shm/desktop/src/editor'
import {Block as ServerBlock} from '@shm/shared/src/client/grpc-types'
import {
  ColorAnnotation,
  HMInlineContent,
  HMTextAnnotation,
  InlineEmbedAnnotation,
} from '../hm-types'

function styleMarkToAnnotationType(
  style: keyof Styles,
): Exclude<HMTextAnnotation, InlineEmbedAnnotation | ColorAnnotation>['type'] {
  if (style === 'bold') return 'strong'
  if (style === 'italic') return 'emphasis'
  if (style === 'underline') return 'underline'
  if (style === 'strike') return 'strike'
  if (style === 'code') return 'code'
  throw new Error('Cannot handle this style yet')
}

export function extractContent(content: Array<HMInlineContent>): {
  annotations: Array<HMTextAnnotation>
  text: string
} {
  let text = ''
  const annotations: Array<HMTextAnnotation> = []
  const styleStarts: Record<string, number> = {}
  let charIndex = 0

  content.forEach((inline) => {
    if (inline.type === 'link') {
      const linkContent = extractContent(inline.content)
      const linkLength = linkContent.text.length
      text += linkContent.text
      linkContent.annotations.forEach((annotation) => {
        annotations.push({
          ...annotation,
          starts: annotation.starts.map((start) => start + charIndex),
          ends: annotation.ends.map((end) => end + charIndex),
        })
      })
      annotations.push({
        type: 'link',
        starts: [charIndex],
        ends: [charIndex + linkLength],
        ref: inline.href,
      })
      charIndex += linkLength
    } else {
      if (inline.type == 'inline-embed') {
        const inlineLength = 1
        annotations.push({
          type: 'inline-embed',
          ref: inline.ref,
          starts: [charIndex],
          ends: [charIndex + inlineLength],
          attributes: {},
        })

        text += ' '
        charIndex++
      } else {
        const inlineLength = inline.text.length

        // Check for style starts
        if ('styles' in inline) {
          const {styles} = inline
          for (const style in styles) {
            if (
              styles[style as keyof Styles] &&
              styleStarts[style] === undefined
            ) {
              styleStarts[style] = charIndex
            }
          }

          // Check for style ends
          for (const style in styleStarts) {
            if (
              styles &&
              !styles[style as keyof Styles] &&
              styleStarts[style] !== undefined
            ) {
              // @ts-expect-error
              annotations.push({
                type: styleMarkToAnnotationType(style as keyof Styles),
                starts: [styleStarts[style]],
                ends: [charIndex],
              })
              delete styleStarts[style]
            }
          }
        }

        text += inline.text
        charIndex += inlineLength
      }
    }
  })

  // Check for any styles that didn't end
  for (const style in styleStarts) {
    if (styleStarts[style] !== undefined) {
      // @ts-expect-error
      annotations.push({
        type: styleMarkToAnnotationType(style as keyof Styles),
        starts: [styleStarts[style]],
        ends: [charIndex],
      })
    }
  }

  return {text, annotations}
}

export function fromHMBlock(
  editorBlock: EditorBlock<typeof hmBlockSchema>,
): ServerBlock {
  if (!editorBlock.id) throw new Error('this block has no id')

  let res: ServerBlock | null = null

  if (editorBlock.type === 'paragraph') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'paragraph',
      attributes: {},
      ...extractContent(editorBlock.content),
    })
  }

  if (editorBlock.type === 'heading') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'heading',
      attributes: {
        level: editorBlock.props.level,
      },
      ...extractContent(editorBlock.content),
    })
  }

  if (['math', 'equation'].includes(editorBlock.type)) {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'math',
      attributes: {},
      ...extractContent(editorBlock.content),
    })
  }

  if (editorBlock.type === 'image') {
    let ref = editorBlock.props.url

    if (ref && !ref?.startsWith('http') && !ref?.startsWith('ipfs://')) {
      ref = `ipfs://${editorBlock.props.url}`
    }

    res = new ServerBlock({
      id: editorBlock.id,
      type: 'image',
      attributes: {
        name: editorBlock.props.name,
        width: editorBlock.props.width,
      },
      ref: ref || '',
      ...extractContent(editorBlock.content),
    })
  }

  if (editorBlock.type == 'imagePlaceholder') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'image',
      attributes: {
        name: editorBlock.props.name,
      },
      ref: '',
      ...extractContent(editorBlock.content),
    })
  }

  if (editorBlock.type === 'file') {
    let ref = editorBlock.props.url

    if (ref && !ref?.startsWith('http') && !ref?.startsWith('ipfs://')) {
      ref = `ipfs://${editorBlock.props.url}`
    }

    res = new ServerBlock({
      id: editorBlock.id,
      type: 'file',
      attributes: {
        name: editorBlock.props.name,
        size: editorBlock.props.size,
      },
      ref: ref || '',
    })
  }

  if (editorBlock.type === 'nostr') {
    let ref = editorBlock.props.url

    if (ref && !ref?.startsWith('http') && !ref?.startsWith('ipfs://')) {
      ref = `ipfs://${editorBlock.props.url}`
    }

    res = new ServerBlock({
      id: editorBlock.id,
      type: 'file',
      attributes: {
        subType: 'nostr:note',
        name: editorBlock.props.name,
        size: editorBlock.props.size,
        text: editorBlock.props.text,
      },
      ref: ref || '',
    })
  }

  if (editorBlock.type == 'web-embed') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'web-embed',
      ref: editorBlock.props.url,
    })
  }

  if (editorBlock.type == 'video') {
    let ref = editorBlock.props.url

    if (ref && !ref?.startsWith('http') && !ref?.startsWith('ipfs://')) {
      ref = `ipfs://${editorBlock.props.url}`
    }
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'video',
      attributes: {
        name: editorBlock.props.name,
        width: editorBlock.props.width,
      },
      ref: ref || '',
    })
  }

  if (editorBlock.type == 'embed') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'embed',
      ref: editorBlock.props.url,
      text: '',
      annotations: [],
      attributes: {
        view: editorBlock.props.view,
      },
    })
  }

  if (editorBlock.type == 'codeBlock') {
    res = new ServerBlock({
      id: editorBlock.id,
      type: 'codeBlock',
      attributes: {
        language: editorBlock.props.language,
      },
      ...extractContent(editorBlock.content),
    })
  }

  if (res) {
    res = extractChildrenType(res, editorBlock)
    // res = addLevelAttr(res, editorBlock)
    return res
  }

  throw new Error('not implemented')
}

function extractChildrenType(
  block: ServerBlock,
  editorBlock: EditorBlock<typeof hmBlockSchema>,
): ServerBlock {
  if (editorBlock.props.childrenType) {
    block.attributes.childrenType = editorBlock.props.childrenType
    block.attributes.listLevel = editorBlock.props.listLevel
  }

  if (editorBlock.props.start) {
    block.attributes.start = editorBlock.props.start
  }

  return block
}

function addLevelAttr(
  block: ServerBlock,
  editorBlock: EditorBlock<typeof hmBlockSchema>,
): ServerBlock {
  block.attributes.level = editorBlock.props.level

  return block
}
