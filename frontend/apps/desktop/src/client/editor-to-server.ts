import {Block as ServerBlock} from '@mintter/shared'
import {Block as EditorBlock, InlineContent, Styles} from '@app/blocknote-core'
import {hdBlockSchema} from './schema'
import {TextAnnotation} from '@mintter/shared'

export function extractContent(content: InlineContent[]): {
  annotations: TextAnnotation[]
  text: string
} {
  let text = ''
  const annotations: TextAnnotation[] = []
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
      let {styles} = inline
      if (!styles) styles = {}
      const inlineLength = inline.text.length

      // Check for style starts
      for (const style in styles) {
        if (styles[style as keyof Styles] && styleStarts[style] === undefined) {
          styleStarts[style] = charIndex
        }
      }

      // Check for style ends
      for (const style in styleStarts) {
        if (
          !styles[style as keyof Styles] &&
          styleStarts[style] !== undefined
        ) {
          annotations.push({
            type: style === 'bold' ? 'strong' : 'emphasis',
            starts: [styleStarts[style]],
            ends: [charIndex],
          })
          delete styleStarts[style]
        }
      }

      text += inline.text
      charIndex += inlineLength
    }
  })

  // Check for any styles that didn't end
  for (const style in styleStarts) {
    if (styleStarts[style] !== undefined) {
      annotations.push({
        type: style === 'bold' ? 'strong' : 'emphasis',
        starts: [styleStarts[style]],
        ends: [charIndex],
      })
    }
  }

  return {text, annotations}
}

export function editorBlockToServerBlock(
  editorBlock: EditorBlock<typeof hdBlockSchema>,
): ServerBlock {
  if (!editorBlock.id) throw new Error('this block has no id')
  if (editorBlock.type === 'paragraph') {
    return new ServerBlock({
      id: editorBlock.id,
      type: 'paragraph',
      attributes: {},
      ...extractContent(editorBlock.content),
    })
  }
  if (editorBlock.type === 'heading') {
    return new ServerBlock({
      id: editorBlock.id,
      type: 'heading',
      attributes: {},
      ...extractContent(editorBlock.content),
    })
  }
  if (editorBlock.type === 'image') {
    return new ServerBlock({
      id: editorBlock.id,
      type: 'image',
      attributes: {
        alt: editorBlock.props.alt,
      },
      ref: `ipfs://${editorBlock.props.url}`, // currently the url is always an ipfs url
    })
  }
  throw new Error('not implemented')
}
