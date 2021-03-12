import {
  Document,
  BlockRefList,
  BlockRef,
} from '@mintter/api/documents/v1alpha/documents_pb';
import { toDocument } from '../transformers';
import { makeProto } from '../make-proto';

test('toDocument', () => {
  const expected = makeProto(new Document(), {
    id: 'document-test',
    version: 'document-version',
    title: 'Demo Test Document',
    subtitle: 'Subtitle demo',
    author: 'horacio',
    blockRefList: makeProto(new BlockRefList(), {
      style: BlockRefList.Style.NONE,
      refs: [
        makeProto(new BlockRef(), {
          ref: 'test-id',
        }),
      ],
    }),
  });

  const result = toDocument({
    document: {
      id: 'document-test',
      version: 'document-version',
      author: 'horacio',
    },
    state: {
      title: 'Demo Test Document',
      subtitle: 'Subtitle demo',
      blocks: [
        {
          type: 'block_list',
          id: 'block_list_id',
          listStyle: BlockRefList.Style.NONE,
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
  });

  expect(result).toEqual(expected);
});
