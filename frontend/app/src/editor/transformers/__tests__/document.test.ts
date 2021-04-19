import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { createEditor } from 'slate';
import faker from 'faker';
import { id as getId } from '../../id';
import { makeProto } from '../make-proto';
import {
  QuoteNode,
  quoteSerialize,
  textRunSerialize,
  inlineElementSerialize,
  createTextRun,
  PartialTextRun,
  blockSerialize,
  BlockNode,
  linkSerialize,
  LinkNode,
  SlateDocument,
  documentSerialize,
} from '../transformers';

describe('Document Serializer', () => {
  it('default (one block)', () => {
    const editor = createEditor();
    const docId = getId();
    const blockId = getId();
    const block: BlockNode = {
      type: 'block',
      id: blockId,
      style: documents.Block.Type.BASIC,
      children: [
        {
          text: 'Hello World',
        },
      ],
    };
    const document: SlateDocument = {
      id: docId,
      title: 'Simple Document Test',
      subtitle: 'test document subtitle',
      author: faker.finance.bitcoinAddress(),
      blocks: [
        {
          type: 'block_list',
          id: getId(),
          listStyle: documents.ListStyle.NONE,
          children: [block],
        },
      ],
    };

    // this is created because I need to pass it to the function in order to know each block's parent and all the relations
    const blocks: [string, documents.Block][] = [
      [blockId, blockSerialize(block)],
    ];

    const result = documentSerialize({ document, blocks });

    const expected = makeProto(new documents.Document(), {
      title: document.title,
      subtitle: document.subtitle,
      author: document.author,
      children: [blockId],
      childrenListStyle: document.blocks[0].listStyle,
    });

    const blocksMap = expected.getBlocksMap();

    blocksMap.set(blockId, blockSerialize(block));

    expect(result).to.deep.equal(expected);
  });

  it('nested blocks', () => {
    const editor = createEditor();
    const nestedBlock: BlockNode = {
      type: 'block',
      id: getId(),
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
    };
    const block: BlockNode = {
      id: getId(),
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
          children: [nestedBlock],
        },
      ],
    };

    const document: SlateDocument = {
      id: getId(),
      title: 'Simple Document Test',
      subtitle: 'test document subtitle',
      author: faker.finance.bitcoinAddress(),
      blocks: [
        {
          type: 'block_list',
          id: getId(),
          listStyle: documents.ListStyle.NONE,
          children: [block],
        },
      ],
    };

    const blocks: [string, documents.Block][] = [
      [block.id, blockSerialize(block)],
      [nestedBlock.id, blockSerialize(nestedBlock, block.id)],
    ];

    const result = documentSerialize({ document, blocks });

    const expected = makeProto(new documents.Document(), {
      title: document.title,
      subtitle: document.subtitle,
      author: document.author,
      children: [block.id],
      childrenListStyle: document.blocks[0].listStyle,
    });

    const blocksMap = expected.getBlocksMap();
    blocksMap.set(block.id, blockSerialize(block));
    blocksMap.set(nestedBlock.id, blockSerialize(nestedBlock, block.id));

    expect(result).to.deep.equal(expected);
  });
});
