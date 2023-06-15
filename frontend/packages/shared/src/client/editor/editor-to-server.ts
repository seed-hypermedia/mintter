import {Block as EditorBlock} from '@mtt-blocknote/core'
import {Block as ServerBlock} from './hyperdocs-presentation'
import {hdBlockSchema} from './schema'

export function editorBlockToServerBlock(
  editorBlock: EditorBlock<typeof hdBlockSchema>,
): ServerBlock {
  console.log('editorBlockToServerBlock', editorBlock)
  if (!editorBlock.id) throw new Error('this block has no id')
  if (editorBlock.type === 'paragraph') {
    return {
      id: editorBlock.id,
      type: 'section',
      text: '',
      annotations: [],
      attributes: {},
    }
  }
  throw new Error('not implemented')
}
