import { expect } from '@esm-bundle/chai';
import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { makeProto } from '@utils/make-proto';
import { ELEMENT_BLOCK } from './editor/block-plugin';
import { toInlineElement, toTextRun } from './inline-element';
import { toDocument, ToDocumentProps } from './to-document';

describe('toDocument', () => {
  it('one block document', () => {
    const test: ToDocumentProps = {
      id: 'test',
      title: 'title',
      subtitle: 'subtitle',
      author: 'author',
      blocks: [
        {
          type: ELEMENT_BLOCK,
          id: 'block-1',
          parent: 0,
          children: [
            {
              text: 'hello world',
            },
          ],
        },
      ],
    };
    const expected = makeProto<documents.Document.AsObject, documents.Document>(
      new documents.Document(),
      {
        id: 'test',
        title: 'title',
        subtitle: 'subtitle',
        author: 'author',
        children: ['block-1'],
        childrenListStyle: documents.ListStyle.NONE,
      },
    );

    let block = makeProto<documents.Block.AsObject, documents.Block>(
      new documents.Block(),
      {
        id: 'block-1',
        parent: '',
        childListStyle: documents.ListStyle.NONE,
      },
    );

    block.setElementsList([
      toInlineElement({
        textRun: toTextRun({ text: 'hello world' }),
      }),
    ]);

    expected.getBlocksMap().set(block.getId(), block);

    expect(toDocument(test).toObject()).to.deep.equal(expected.toObject());
  });
});
