import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import type { Text } from 'slate';
import faker from 'faker';
import { id as getId } from '../id';
import { makeProto } from './make-proto';
import {
  QuoteNode,
  quoteSerialize,
  textRunSerialize,
  inlineElementSerialize,
  createTextRun,
  PartialTextRun,
  blockSerialize,
  BlockNode,
} from './transformers';

describe('Transformers: TextRun Serialize', () => {
  it('default: no attributes', () => {
    const textNode: Text = {
      text: 'Hello World',
    };
    const result = textRunSerialize(textNode);
    const expected = makeProto(new documents.TextRun(), {
      text: 'Hello World',
    });

    expect(result).to.deep.equal(expected);
  });

  it('text with attributes', () => {
    const textNode: Text = {
      text: 'hello world with bold and underline',
      bold: true,
      underline: true,
    };

    const result = textRunSerialize(textNode);
    const expected = makeProto(new documents.TextRun(), textNode);
    expect(result).to.deep.equal(expected);
  });
});

describe('Transformers: Quote Serialize', () => {
  it('default', () => {
    const quote: QuoteNode = {
      id: getId(),
      type: 'quote',
      linkKey: 'mintter://1234567asdfghj/asdfgasdfgh',
      startOffset: 0,
      endOffset: 0,
      children: [{ text: '' }],
    };

    const result = quoteSerialize(quote);
    const expected = makeProto(new documents.Quote(), {
      linkKey: quote.linkKey,
      startOffset: quote.startOffset,
      endOffset: quote.endOffset,
    });

    expect(result).to.deep.equal(expected);
  });
});

describe('Transformer: InlineElement Serializer', () => {
  it('TextRun', () => {
    const node: PartialTextRun = {
      text: 'Hello World',
      bold: true,
    };

    const expected = makeProto(new documents.InlineElement(), {
      textRun: textRunSerialize(createTextRun(node)),
    });

    const result = inlineElementSerialize(node);

    // console.log({ result, expected });

    expect(result).to.deep.equal(expected);
  });

  it('Quote', () => {
    const node: QuoteNode = {
      id: getId(),
      type: 'quote',
      linkKey: `mintter://${faker.git.commitSha()}`,
      startOffset: 0,
      endOffset: 0,
      children: [{ text: '' }],
    };

    const result = inlineElementSerialize(node);
    const expected = makeProto(new documents.InlineElement(), {
      quote: quoteSerialize(node),
    });

    expect(result).to.deep.equal(expected);
  });
});

describe('Tranformers: Block Serializer', () => {
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
});
