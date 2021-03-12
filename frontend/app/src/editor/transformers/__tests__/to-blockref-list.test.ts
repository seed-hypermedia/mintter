import { toBlockRefList } from '../transformers';
import { makeProto } from '../make-proto';
import {
  BlockRefList,
  BlockRef,
} from '@mintter/api/documents/v1alpha/documents_pb';

test('toBlockRefList: simple text block', () => {
  const slateTree = {
    type: 'block_list',
    listStyle: BlockRefList.Style.NONE,
    children: [
      {
        type: 'block',
        id: 'block-test-id',
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
    ],
  };

  const expected = makeProto(new BlockRefList(), {
    style: BlockRefList.Style.NONE,
    refs: [
      makeProto(new BlockRef(), {
        ref: 'block-test-id',
      }),
    ],
  });

  expect(toBlockRefList(slateTree)).toEqual(expected);
});

test('toBlockRefList: nested blocks', () => {
  const slateTree = {
    type: 'block_list',
    listStyle: BlockRefList.Style.NONE,
    children: [
      {
        type: 'block',
        id: 'block-test-id',
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
          {
            type: 'block_list',
            listStyle: BlockRefList.Style.BULLET,
            children: [
              {
                type: 'block',
                id: 'nested-block-test-id',
                children: [
                  {
                    type: 'p',
                    children: [
                      {
                        text: 'Nested block',
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
  };

  const expected = makeProto(new BlockRefList(), {
    style: BlockRefList.Style.NONE,
    refs: [
      makeProto(new BlockRef(), {
        ref: 'block-test-id',
        blockRefList: makeProto(new BlockRefList(), {
          style: BlockRefList.Style.BULLET,
          refs: [
            makeProto(new BlockRef(), {
              ref: 'nested-block-test-id',
            }),
          ],
        }),
      }),
    ],
  });

  expect(toBlockRefList(slateTree)).toEqual(expected);
});
