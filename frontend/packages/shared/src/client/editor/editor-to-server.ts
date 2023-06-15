import {Block as EditorBlock, InlineContent} from '@mtt-blocknote/core'
import {Block as ServerBlock, TextAnnotation} from './hyperdocs-presentation'
import {hdBlockSchema} from './schema'

export function extractContent(content: InlineContent[]): {
  text: string
  annotations: TextAnnotation[]
} {
  let text = ''
  const annotations: TextAnnotation[] = []
  const styleStarts: Record<string, number> = {}

  content.forEach((inline, index) => {
    if (inline.type === 'link') throw new Error('Unprepared for links')
    text += inline.text
    const {styles} = inline

    // Check for style starts
    for (const style in styles) {
      // @ts-expect-error
      if (styles[style] && styleStarts[style] === undefined) {
        styleStarts[style] = index
      }
    }

    // Check for style ends
    for (const style in styleStarts) {
      // @ts-expect-error
      if (!styles[style] && styleStarts[style] !== undefined) {
        annotations.push({
          type: style === 'bold' ? 'strong' : 'emphasis',
          starts: [styleStarts[style]],
          ends: [index],
        })
        delete styleStarts[style]
      }
    }
  })

  // Check for any styles that didn't end
  for (const style in styleStarts) {
    if (styleStarts[style] !== undefined) {
      annotations.push({
        type: style === 'bold' ? 'strong' : 'emphasis',
        starts: [styleStarts[style]],
        ends: [text.length],
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
    return {
      id: editorBlock.id,
      type: 'paragraph',
      attributes: {},
      ...extractContent(editorBlock.content),
    }
  }
  if (editorBlock.type === 'heading') {
    return {
      id: editorBlock.id,
      type: 'heading',
      attributes: {},
      ...extractContent(editorBlock.content),
    }
  }

  throw new Error('not implemented')
}
