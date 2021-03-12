import { toSlateBlock } from '../transformers';
import { makeProto } from '../make-proto';
import {
  Block,
  Paragraph,
  InlineElement,
} from '@mintter/api/documents/v1alpha/documents_pb';
import { ELEMENT_PARAGRAPH } from '../../elements/defaults';
import { ELEMENT_BLOCK } from '../../block-plugin/defaults';

test('toSlateBlock: paragraph', () => {
  const block: Block.AsObject = {
    id: 'block-test-id',
    paragraph: {
      inlineElementsList: [{ text: 'Test block' }],
    },
    quotersList: [],
  };

  makeProto(new Block(), {
    paragraph: makeProto(new Paragraph(), {
      inlineElements: [
        makeProto(new InlineElement(), {
          text: 'Test block',
        }),
      ],
    }),
  });

  const expected = {
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
    ],
  };

  expect(toSlateBlock(block)).toEqual(expected);
});
