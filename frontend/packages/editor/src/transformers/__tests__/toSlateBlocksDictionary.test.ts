import {toSlateBlocksDictionary} from '../transformers'
import { makeProto} from '../makeProto'
import {Block, Paragraph, InlineElement} from '@mintter/proto/v2/documents_pb'
import {ELEMENT_PARAGRAPH} from '../../elements'
import {ELEMENT_BLOCK} from '../../BlockPlugin/defaults'

test('toSlateBlocksDictionary', () => {
  const blocks = [
    makeProto(new Block(), {
      id: 'block-test-id',
      paragraph: makeProto(new Paragraph(), {
        inlineElements: [
          makeProto(new InlineElement(), {
            text: 'Test block',
          }),
        ],
      }),
    }),
  ]

  const expected = {
    'block-test-id': {
      type: ELEMENT_BLOCK,
      id: 'block-test-id',
      children: [
        {
          type: ELEMENT_PARAGRAPH,
          children: [
            {
              text: 'Test block',
            },
          ],
        },
      ],
    },
  }

  expect(toSlateBlocksDictionary(blocks)).toEqual(expected)
})
