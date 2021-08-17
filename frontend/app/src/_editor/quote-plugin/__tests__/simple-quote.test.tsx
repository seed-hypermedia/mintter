import {createEditor, Editor} from 'slate'
import type {EditorBlock, EditorQuote} from '../../types'
import {withQuote} from '../with-quote'

const e = createEditor() as Editor

describe('simple quote', () => {
  test('simple quote', () => {
    const editor = withQuote()(e as any)
    editor.children = [
      {
        type: 'block',
        id: 'block1',
        children: [
          {
            type: 'quote',
            id: 'quote1',
            url: 'mtt://hello/world',
            children: [{text: ''}],
          } as EditorQuote,
        ],
      } as EditorBlock,
    ]
  })
})
