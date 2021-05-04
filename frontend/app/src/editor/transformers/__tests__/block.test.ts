import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import faker from 'faker';
import { id as getId } from '../../id';
import { makeProto } from '../make-proto';
import {
  textRunSerialize,
  createTextRun,
  blockSerialize,
  BlockNode,
} from '../transformers';

describe('Block Serializer', () => {
  it('default', () => {
    const blockId = getId();
    const block: BlockNode = {
      id: blockId,
      type: 'block',
      style: documents.Block.Type.BASIC,
      children: [
        {
          type: 'p',
          children: [
            {
              text: 'Hello Block',
            },
          ],
        },
      ],
    };

    const result = blockSerialize(block);

    const expected = makeProto(new documents.Block(), {
      type: documents.Block.Type.BASIC,
      id: blockId,
      elements: [
        makeProto(new documents.InlineElement(), {
          textRun: textRunSerialize(createTextRun({ text: 'Hello Block' })),
        }),
      ],
    });

    // console.log({ result, expected });
    expect(result).to.deep.equal(expected);
  });

  it('with BlockList (just checking children addition)', () => {
    const blockId = getId();
    const nestedBlockId = getId();
    const block: BlockNode = {
      id: blockId,
      type: 'block',
      style: documents.Block.Type.BASIC,
      children: [
        {
          type: 'p',
          children: [
            {
              text: 'Hello Block',
            },
          ],
        },
        {
          type: 'block_list',
          listStyle: documents.ListStyle.NONE,
          id: getId(),
          children: [
            {
              type: 'block',
              id: nestedBlockId,
              style: documents.Block.Type.BASIC,
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
    };

    const result = blockSerialize(block);

    const expected = makeProto(new documents.Block(), {
      type: documents.Block.Type.BASIC,
      id: blockId,
      elements: [
        makeProto(new documents.InlineElement(), {
          textRun: textRunSerialize(createTextRun({ text: 'Hello Block' })),
        }),
      ],
      childListStyle: documents.ListStyle.NONE,
      children: [nestedBlockId],
    });

    expect(result).to.deep.equal(expected);
  });

  it('with Link (multiple InlineElements)', () => {
    const blockId = getId();
    const linkId = getId();
    const block: BlockNode = {
      id: blockId,
      type: 'block',
      style: documents.Block.Type.BASIC,
      children: [
        {
          type: 'p',
          children: [
            {
              text: 'Hello ',
            },
            {
              id: linkId,
              type: 'link',
              url: 'https://mintter.com',
              children: [
                {
                  text: 'link with ',
                },
                {
                  text: 'multiple childs',
                  bold: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = blockSerialize(block);

    const expected = makeProto(new documents.Block(), {
      type: documents.Block.Type.BASIC,
      id: blockId,
      elements: [
        makeProto(new documents.InlineElement(), {
          textRun: textRunSerialize(
            createTextRun({
              text: 'Hello ',
            }),
          ),
        }),
        makeProto(new documents.InlineElement(), {
          textRun: textRunSerialize(
            createTextRun({
              text: 'link with ',
              linkKey: linkId,
            }),
          ),
        }),
        makeProto(new documents.InlineElement(), {
          textRun: textRunSerialize(
            createTextRun({
              text: 'multiple childs',
              bold: true,
              linkKey: linkId,
            }),
          ),
        }),
      ],
    });
    expect(result).to.deep.equal(expected);
  });
});
