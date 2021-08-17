import {Block, InlineElement, ListStyle, TextRun, Document, Link} from '@mintter/client'
import {toInlineElement, toTextRun} from './inline-element'
import {ELEMENT_BLOCK} from './block-plugin'
import type {EditorBlock} from './types'
import {toEditorValue} from './to-editor-value'
import {ELEMENT_LINK} from './link-plugin'

describe('toEditorValue', () => {
  it('simple document', () => {
    const block = Block.fromPartial({
      id: 'block-1',
      parent: '',
      childListStyle: ListStyle.NONE,
      elements: [
        InlineElement.fromPartial({
          textRun: TextRun.fromPartial({text: 'hello world'}),
        }),
      ],
    })

    const doc = Document.fromPartial({
      id: 'doc-id',
      blocks: {
        [block.id]: block,
      },
      children: [block.id],
      childrenListStyle: ListStyle.NONE,
    })

    const expected: Array<EditorBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        listStyle: ListStyle.NONE,
        children: [
          {
            text: 'hello world',
            blockquote: false,
            bold: false,
            code: false,
            italic: false,
            linkKey: '',
            strikethrough: false,
            underline: false,
          },
        ],
      },
    ]

    expect(toEditorValue(doc)).toEqual(expected)
  })

  it('with link', () => {
    const editorText = {
      text: 'hello world',
      blockquote: false,
      bold: false,
      code: false,
      italic: false,
      strikethrough: false,
      underline: false,
    }
    const block = Block.fromPartial({
      id: 'block-1',
      parent: '',
      childListStyle: ListStyle.NONE,
      elements: [
        toInlineElement({
          textRun: toTextRun({...editorText, linkKey: 'link-1'}),
        }),
      ],
    })

    const doc = Document.fromPartial({
      id: 'doc-id',
      blocks: {
        'block-1': block,
      },
      children: [block.id],
      childrenListStyle: ListStyle.NONE,
      links: {
        'link-1': Link.fromPartial({
          uri: 'https://example.test',
        }),
      },
    })

    const expected: Array<EditorBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        listStyle: ListStyle.NONE,
        children: [
          {
            type: ELEMENT_LINK,
            id: 'link-1',
            url: 'https://example.test',
            children: [editorText],
          },
        ],
      },
    ]

    // console.log({doc: JSON.stringify(toEditorValue(doc)), expected: JSON.stringify(expected)})

    expect(toEditorValue(doc)).toEqual(expected)
  })
})
