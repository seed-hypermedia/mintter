import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import { toSlateBlock } from '../transformers';

test('blocksToSlate: from block to Slate blocks', () => {
  const block: documents.Block.AsObject = {
    id: 'block-test-id',
    paragraph: {
      inlineElementsList: [
        { text: 'Hello ' },
        {
          text: 'World!',
          textStyle: {
            bold: true,
            italic: false,
            underline: false,
            code: false,
          },
        },
      ],
    },
    quotersList: [],
  };

  expect(toSlateBlock(block)).toMatchInlineSnapshot(`
    Object {
      "children": Array [
        Object {
          "children": Array [
            Object {
              "text": "Hello ",
            },
            Object {
              "bold": true,
              "code": false,
              "italic": false,
              "text": "World!",
              "underline": false,
            },
          ],
          "type": "p",
        },
      ],
      "id": "block-test-id",
      "quotersList": Array [],
      "type": "block",
    }
  `);
});
