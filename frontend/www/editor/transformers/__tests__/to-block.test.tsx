/** @jsx jsx */
import {jsx} from 'test/jsx'
import {Editor} from 'slate'
import {toBlock} from '../transformers'
import {makeProto} from '../make-proto'
import {
  Block,
  Paragraph,
  InlineElement,
  TextStyle,
} from '@mintter/api/v2/documents_pb'

test('toBlock: simple text block', () => {
  const input = ((
    <editor>
      <block id="test-1">
        <hp>
          Hello <htext bold>World!</htext>
        </hp>
      </block>
    </editor>
  ) as any) as Editor

  const blockNode = input.children[0]

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

  expect(toBlock(blockNode as any)).toEqual(expected) // TODO: fix types
})

// test('toBlock: block with image', () => {})
