import { expect } from '@esm-bundle/chai';
import { makeProto } from '@utils/make-proto';
import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { buildDocument } from '@utils/generate';
import { createId } from '@utils/create-id';
import { toInlineElement, toLink, toTextRun } from './inline-element';
import { ELEMENT_BLOCK } from './editor/block-plugin';
import type { SlateBlock } from './editor/types';
import { toEditorValue } from './to-editor-value';
import { ELEMENT_LINK } from './editor/link-plugin';

describe('toEditorValue', () => {
  it('simple document', () => {
    let block = makeProto<documents.Block, documents.Block.AsObject>(
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

    // console.log({ block: JSON.stringify(block.toObject(), null, 2) });
    const doc = buildDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: documents.ListStyle.NONE,
    });

    let expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: documents.ListStyle.NONE,
        children: [
          toTextRun({
            text: 'hello world',
          }).toObject(),
        ],
      },
    ];

    // console.log({
    //   result: JSON.stringify(toEditorValue(doc)[0], null, 2),
    //   expected: JSON.stringify(expected[0], null, 2),
    // });

    expect(toEditorValue(doc)).to.deep.equal(expected);
  });

  it('with link', () => {
    let block = makeProto<documents.Block, documents.Block.AsObject>(
      new documents.Block(),
      {
        id: 'block-1',
        parent: '',
        childListStyle: documents.ListStyle.NONE,
      },
    );

    block.setElementsList([
      toInlineElement({
        textRun: toTextRun({ text: 'hello world', linkKey: 'link-key' }),
      }),
    ]);

    // console.log({ block: JSON.stringify(block.toObject(), null, 2) });
    const doc = buildDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: documents.ListStyle.NONE,
    });

    doc.getLinksMap().set(
      'link-key',
      toLink({
        type: ELEMENT_LINK,
        id: 'link-key',
        url: 'https://example.test',
        children: [
          toTextRun({
            text: 'hello world',
          }).toObject(),
        ],
      }),
    );

    let expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: documents.ListStyle.NONE,
        children: [
          {
            type: ELEMENT_LINK,
            url: 'https://example.test',
            children: [
              toTextRun({
                text: 'hello world',
                linkKey: 'link-key',
              }).toObject(),
            ],
          },
        ],
      },
    ];

    // console.log({
    //   result: JSON.stringify(toEditorValue(doc)[0], null, 2),
    //   expected: JSON.stringify(expected[0], null, 2),
    // });

    expect(toEditorValue(doc)).to.deep.equal(expected);
  });
});
