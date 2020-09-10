import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
} from '@mintter/proto/v2/documents_pb'
import {toBlock, makeProto} from '../transformers'

test('should return the proper result', () => {
  const slateBlocks = [
    {
      type: 'block',
      id: 'block-test-id',
      author: '',
      children: [
        {
          type: 'p',
          children: [
            {
              text: 'Hello ',
            },
            {
              text: 'World!',
              bold: true,
            },
          ],
        },
      ],
    },
  ]

  const expected: Block[] = [
    makeProto(new Block(), {
      id: 'block-2',
      paragraph: makeProto(new Paragraph(), {
        inlineElements: [
          makeProto(new InlineElement(), {
            text: 'Hello ',
          }),
          makeProto(new InlineElement(), {
            text: 'World!',
            textStyle: makeProto(new TextStyle(), {
              bold: true,
            }),
          }),
        ],
      }),
    }),
  ]

  expect(toBlock(slateBlocks)).toEqual(expected)
})
