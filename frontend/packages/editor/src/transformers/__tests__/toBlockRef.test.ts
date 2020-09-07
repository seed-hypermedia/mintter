import {toBlockRef, makeProto} from '../transformers'
import {BlockRef, BlockRefList} from '@mintter/proto/v2/documents_pb'

test('toBlockRef: simple block', () => {
  const slateBlock = {
    type: 'block',
    id: 'test-block-id',
    children: [
      {
        type: 'p',
        children: [{text: 'demo block'}],
      },
    ],
  }

  const expected = makeProto(new BlockRef(), {
    ref: 'test-block-id',
  })

  expect(toBlockRef(slateBlock)).toEqual(expected)
})

test('toBlockRef: nested blocks', () => {
  const slateBlock = {
    type: 'block',
    id: 'test-block-id',
    children: [
      {
        type: 'p',
        children: [{text: 'demo block'}],
      },
      {
        type: 'block_list',
        listType: BlockRefList.Style.NONE,
        children: [
          {
            type: 'block',
            id: 'test-nested-block-id',
            children: [
              {
                type: 'p',
                children: [{text: 'demo block'}],
              },
            ],
          },
        ],
      },
    ],
  }

  const expected = makeProto(new BlockRef(), {
    ref: 'test-block-id',
    blockRefList: makeProto(new BlockRefList(), {
      style: BlockRefList.Style.NONE,
      refs: [
        makeProto(new BlockRef(), {
          ref: 'test-nested-block-id',
        }),
      ],
    }),
  })

  expect(toBlockRef(slateBlock)).toEqual(expected)
})
