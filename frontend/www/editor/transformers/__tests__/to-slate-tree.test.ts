import {toSlateTree} from '../transformers'
import {BlockRefList, Block} from '@mintter/api/v2/documents_pb'
import {ELEMENT_PARAGRAPH} from '../../elements/defaults'
import {ELEMENT_BLOCK_LIST} from '../../hierarchy-plugin/defaults'
import {ELEMENT_BLOCK} from '../../block-plugin/defaults'

const id = 'mock_id'

jest.mock('nanoid', () => ({
  nanoid: () => id,
}))

test('toSlateTree: one level', () => {
  const blocksMap: [string, Block.AsObject][] = [
    [
      id,
      {
        id,
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
        ref: id,
      },
    ],
  }

  const expected = {
    type: ELEMENT_BLOCK_LIST,
    listType: BlockRefList.Style.NONE,
    id,
    children: [
      {
        type: ELEMENT_BLOCK,
        id,
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

  expect(toSlateTree({blockRefList, blocksMap})).toEqual(expected)
})

xtest('toSlateTree: two levels', () => {
  const blocksMap: [string, Block.AsObject][] = [
    [
      id,
      {
        id,
        paragraph: {
          inlineElementsList: [{text: 'Test block'}],
        },
        quotersList: [],
      },
    ],
    [
      id,
      {
        id,
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
        ref: id,
        blockRefList: {
          style: BlockRefList.Style.NONE,
          refsList: [
            {
              ref: id,
            },
          ],
        },
      },
    ],
  }

  const expected = {
    type: ELEMENT_BLOCK_LIST,
    id,
    listType: BlockRefList.Style.NONE,
    children: [
      {
        type: ELEMENT_BLOCK,
        id,
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
            id,
            listType: BlockRefList.Style.NONE,
            children: [
              {
                type: ELEMENT_BLOCK,
                id,
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

  expect(toSlateTree({blockRefList, blocksMap})).toEqual(expected)
})
