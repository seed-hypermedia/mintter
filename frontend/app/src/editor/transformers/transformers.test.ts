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
  linkSerialize,
  LinkNode,
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

  it('empty TextNode', () => {
    const node: PartialTextRun = {
      text: '',
    };

    const result = inlineElementSerialize(node);

    // console.log({ result, expected });

    expect(result).to.equal(undefined);
  });

  it('empty TextNode with formatting should be ignored', () => {
    const node: PartialTextRun = {
      text: '',
      bold: true,
    };

    const result = inlineElementSerialize(node);

    // console.log({ result, expected });

    expect(result).to.equal(undefined);
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

  it('Link', () => {
    const node: LinkNode = {
      id: getId(),
      type: 'link',
      url: 'https://mintter.com',
      children: [
        {
          text: 'Hello ',
        },
        {
          text: 'World',
          bold: true,
        },
      ],
    };

    const result = inlineElementSerialize(node);
    const expected = [
      makeProto(new documents.InlineElement(), {
        textRun: textRunSerialize(
          createTextRun({
            text: 'Hello ',
            linkKey: node.id,
          }),
        ),
      }),
      makeProto(new documents.InlineElement(), {
        textRun: textRunSerialize(
          createTextRun({
            text: 'World',
            bold: true,
            linkKey: node.id,
          }),
        ),
      }),
    ];

    expect(result).to.deep.equal(expected);
  });
});

describe('Transformers: Link Serializer', () => {
  it('default', () => {
    const link: LinkNode = {
      id: getId(),
      type: 'link',
      url: 'https://mintter.com',
      children: [
        {
          text: 'Web link',
        },
      ],
    };
    const result = linkSerialize(link);

    const expected = makeProto(new documents.Link(), {
      uri: 'https://mintter.com',
    } as documents.Link.AsObject);

    // console.log({ result, expected });
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

  it('Block with Link (multiple InlineElements)', () => {
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
