import {
  Block,
  Document,
  InlineElement,
  ListStyle,
  TextRun,
} from '@mintter/client'
import { ELEMENT_BLOCK } from './block-plugin'
import { toDocument, ToDocumentProps } from './to-document'

describe('toDocument', () => {
  it('one block document', () => {
    const test: ToDocumentProps = {
      id: 'test',
      title: 'title',
      subtitle: 'subtitle',
      author: 'author',
      childrenListStyle: ListStyle.NONE,
      blocks: [
        {
          type: ELEMENT_BLOCK,
          id: 'block-1',
          listStyle: ListStyle.NONE,
          children: [
            {
              text: 'hello world',
            },
          ],
        },
      ],
    }

    const expected = Document.fromPartial({
      id: 'test',
      title: 'title',
      subtitle: 'subtitle',
      author: 'author',
      children: ['block-1'],
      childrenListStyle: ListStyle.NONE,
      blocks: {
        'block-1': Block.fromPartial({
          id: 'block-1',
          parent: '',
          childListStyle: ListStyle.NONE,
          elements: [
            InlineElement.fromPartial({
              textRun: TextRun.fromPartial({ text: 'hello world' }),
            }),
          ],
        }),
      },
    })

    expect(toDocument(test)).toEqual(expected)
  })
})
