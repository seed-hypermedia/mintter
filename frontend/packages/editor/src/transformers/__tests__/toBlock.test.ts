import {toBlock, makeProto} from '../transformers'
import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
} from '@mintter/proto/v2/documents_pb'

test('should transform Slate blocks to Mintter Blocks', () => {
  const slateNode = {
    type: 'block',
    id: 'test-1',
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
  }

  const expected = makeProto(new Block(), {
    id: 'test-1',
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
  })

  expect(toBlock(slateNode)).toEqual(expected)
})
