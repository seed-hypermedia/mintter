import {
  Document,
  BlockRefList,
  BlockRef,
  Block,
  Paragraph,
  InlineElement,
} from '@mintter/proto/v2/documents_pb'
import {makeProto, toDocument} from '../transformers'

test('toDocument', () => {
  const expected = {
    document: makeProto(new Document(), {
      id: 'document-test',
      title: 'Demo Test Document',
      subtitle: '',
      author: 'horacio',
      blockRefList: makeProto(new BlockRefList(), {
        style: BlockRefList.Style.NONE,
        blocks: [
          makeProto(new BlockRef(), {
            id: 'test-id',
          }),
        ],
      }),
    }),
    blocks: [
      makeProto(new Block(), {
        id: 'test-id',
        paragraph: makeProto(new Paragraph(), {
          inlineElements: [
            makeProto(new InlineElement(), {
              text: 'Test block',
            }),
          ],
        }),
      }),
    ],
  }

  const result = toDocument({
    editorDocument: {
      id: 'document-test',
      title: 'Demo Test Document',
      blocks: [
        {
          type: 'block_list',
          listType: BlockRefList.Style.NONE,
          children: [
            {
              type: 'block',
              id: 'test-id',
              children: [
                {
                  type: 'p',
                  children: [
                    {
                      text: 'Test block',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    blockList: [
      {
        type: 'block',
        id: 'test-id',
        children: [
          {
            type: 'p',
            children: [
              {
                text: 'Test block',
              },
            ],
          },
        ],
      },
    ],
    author: 'horacio',
  })

  expect(result).toEqual(expected)
})
