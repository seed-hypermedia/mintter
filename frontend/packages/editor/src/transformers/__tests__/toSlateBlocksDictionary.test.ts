import {toSlateBlocksDictionary} from '../transformers'
import {Block} from '@mintter/proto/v2/documents_pb'
import {ELEMENT_PARAGRAPH} from '../../elements'
import {ELEMENT_BLOCK} from '../../BlockPlugin/defaults'

test('toSlateBlocksDictionary', () => {
  const blocks: Array<[string, Block.AsObject]> = [
    [
      'block-test-id',
      {
        id: 'block-test-id',
        paragraph: {
          inlineElementsList: [{text: 'Test block'}],
        },
      },
    ],
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
