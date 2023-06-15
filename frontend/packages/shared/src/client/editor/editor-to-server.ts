import {Block as EditorBlock, InlineContent} from '@mtt-blocknote/core'
import {Block as ServerBlock, TextAnnotation} from './hyperdocs-presentation'
import {hdBlockSchema} from './schema'

export function extractContent(content: InlineContent[]): {
  text: string
  annotations: TextAnnotation[]
} {
  let text = ''
  const annotations: TextAnnotation[] = []
  console.log(JSON.stringify(content))
  return {text, annotations}
}

export function editorBlockToServerBlock(
  editorBlock: EditorBlock<typeof hdBlockSchema>,
): ServerBlock {
  console.log('editorBlockToServerBlock', editorBlock)
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
