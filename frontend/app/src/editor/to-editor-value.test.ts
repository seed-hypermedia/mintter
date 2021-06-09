import {Block, InlineElement, ListStyle, TextRun, mock} from '@mintter/client'
import {toInlineElement, toLink, toTextRun} from './inline-element'
import {ELEMENT_BLOCK} from './block-plugin'
import {SlateBlock} from './types'
import {toEditorValue, toEditorLink} from './to-editor-value'
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

    const doc = mock.mockDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: ListStyle.NONE,
    })

    const expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: ListStyle.NONE,
        children: [
          toTextRun({
            text: 'hello world',
          }),
        ],
      },
    ]

    expect(toEditorValue(doc)).toEqual(expected)
  })

  it('with link', () => {
    const block = Block.fromPartial({
      id: 'block-1',
      parent: '',
      childListStyle: ListStyle.NONE,
      elements: [
        toInlineElement({
          textRun: toTextRun({text: 'hello world', linkKey: 'link-key'}),
        }),
      ],
    })

    const linksMap = {
      'link-key': toLink({
        type: ELEMENT_LINK,
        id: 'link-key',
        url: 'https://example.test',
        children: [
          toTextRun({
            text: 'hello world',
          }),
        ],
      }),
    }
    const doc = mock.mockDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: ListStyle.NONE,
      links: linksMap,
    })

    const expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: ListStyle.NONE,
        children: [
          toEditorLink(
            linksMap,
            toTextRun({text: 'hello world', linkKey: 'link-key'}),
          ),
        ],
      },
    ]

    expect(toEditorValue(doc)).toEqual(expected)
  })
})
