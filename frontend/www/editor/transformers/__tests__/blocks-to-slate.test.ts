import {Block} from '@mintter/api/v2/documents_pb'
import {toSlateBlock} from '../transformers'
import {ELEMENT_BLOCK} from '../../block-plugin'

test('blocksToSlate: from block to Slate blocks', () => {
  const block: Block.AsObject = {
    id: 'block-test-id',
    paragraph: {
      inlineElementsList: [
        {text: 'Hello '},
        {
          text: 'World!',
          textStyle: {bold: true, italic: false, underline: false, code: false},
        },
      ],
    },
    quotersList: [],
  }

  const expected = {
    id: 'block-test-id',
    type: ELEMENT_BLOCK,
    quotersList: [],
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
            italic: false,
            underline: false,
            code: false,
          },
        ],
      },
    ],
  }

  expect(toSlateBlock(block)).toEqual(expected)
})
