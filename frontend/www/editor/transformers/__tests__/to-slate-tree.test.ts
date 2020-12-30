import {toSlateTree} from '../transformers'
import {BlockRefList, Block} from '@mintter/api/v2/documents_pb'
import {ELEMENT_PARAGRAPH} from '../../elements/defaults'
import {ELEMENT_BLOCK_LIST} from '../../HierarchyPlugin/defaults'
import {ELEMENT_BLOCK} from '../../block-plugin/defaults'

const block_list_mock_id = 'block_list_mock_id'

jest.mock('nanoid', () => ({
  nanoid: () => block_list_mock_id,
}))

test('toSlateTree: one level', () => {
  const blocksMap: [string, Block.AsObject][] = [
    [
      'block-test-id',
      {
        id: 'block-test-id',
        paragraph: {
          inlineElementsList: [{text: 'Test block'}],
        },
        quotersList: [],
      },
    ],
  ]

  const blockRefList: BlockRefList.AsObject = {
    style: BlockRefList.Style.NONE,
    refsList: [
      {
        ref: 'block-test-id',
      },
    ],
  }

  const expected = {
    type: ELEMENT_BLOCK_LIST,
    listType: BlockRefList.Style.NONE,
    id: block_list_mock_id,
    children: [
      {
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
        quotersList: [],
      },
    ],
  }

  const result = toSlateTree({blockRefList, blocksMap})

  expect(result).toEqual(expected)
})

test('toSlateTree: two levels', () => {
  const blocksMap: [string, Block.AsObject][] = [
    [
      'block-test-id',
      {
        id: 'block-test-id',
        paragraph: {
          inlineElementsList: [{text: 'Test block'}],
        },
        quotersList: [],
      },
    ],
    [
      'nested-block-test-id',
      {
        id: 'nested-block-test-id',
        paragraph: {
          inlineElementsList: [{text: 'Nested Test block'}],
        },
        quotersList: [],
      },
    ],
  ]

  const blockRefList: BlockRefList.AsObject = {
    style: BlockRefList.Style.NONE,
    refsList: [
      {
        ref: 'block-test-id',
        blockRefList: {
          style: BlockRefList.Style.NONE,
          refsList: [
            {
              ref: 'nested-block-test-id',
            },
          ],
        },
      },
    ],
  }

  const expected = {
    type: ELEMENT_BLOCK_LIST,
    id: block_list_mock_id,
    listType: BlockRefList.Style.NONE,
    children: [
      {
        type: ELEMENT_BLOCK,
        id: 'block-test-id',
        quotersList: [],
        children: [
          {
            type: ELEMENT_PARAGRAPH,
            children: [
              {
                text: 'Test block',
              },
            ],
          },
          {
            type: ELEMENT_BLOCK_LIST,
            id: block_list_mock_id,
            listType: BlockRefList.Style.NONE,
            children: [
              {
                type: ELEMENT_BLOCK,
                id: 'nested-block-test-id',
                quotersList: [],
                children: [
                  {
                    type: ELEMENT_PARAGRAPH,
                    children: [
                      {
                        text: 'Nested Test block',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }

  const result = toSlateTree({blockRefList, blocksMap})
  expect(result).toEqual(expected)
})
