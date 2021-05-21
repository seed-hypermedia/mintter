import { expect } from '@esm-bundle/chai';
import { makeProto } from '@utils/make-proto';
import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import {
  toTextRun,
  toLink,
  ToLinkResult,
  toQuote,
  ToQuoteResult,
  toInlineTextRun,
  toInlineElement,
} from './inline-element';
import type { SlateLink, SlateQuote, SlateTextRun } from './editor/types';

describe('TextRun', () => {
  it('simple text', () => {
    const test = {
      text: 'plain text',
    };
    const expected = makeProto(new documents.TextRun(), test);

    const result = toTextRun(test);
    expect(result).to.deep.equal(expected);
  });

  it('text with attributes', () => {
    const test = {
      text: 'text with attributes',
      bold: true,
      underline: true,
    };
    const expected = makeProto(new documents.TextRun(), test);
    const result = toTextRun(test);
    expect(result).to.deep.equal(expected);
  });
});

describe('toLink', () => {
  it('simple link', () => {
    const test: SlateLink = {
      id: 'test',
      type: 'a',
      url: 'https://example.test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };
    const link = makeProto(new documents.Link(), {
      uri: test.url,
    });
    const textRuns = [
      makeProto(new documents.TextRun(), {
        text: 'plain link',
        linkKey: test.id,
      }),
    ];
    const expected: ToLinkResult = { id: test.id, link, textRuns };
    expect(toLink(test)).to.deep.equal(expected);
  });

  it('link with no id', () => {
    const test: Partial<SlateLink> = {
      type: 'a',
      url: 'https://example.test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };

    const expected = `toLink error: "id" cannot be undefined`;
    expect(() => toLink(test)).to.throw(expected);
  });
  it('link with no url', () => {
    const test: Partial<SlateLink> = {
      type: 'a',
      id: 'test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };
    const expected = `toLink error: "url" cannot be undefined`;
    expect(() => toLink(test)).to.throw(expected);
  });
});

describe('SlateLink to TextRun[]', () => {
  const test: SlateLink = {
    id: 'test',
    url: 'https://example.com',
    type: 'a',
    children: [
      {
        text: 'Hello ',
      },
      {
        text: 'World!',
        bold: true,
      },
    ],
  };

  const expected = [
    makeProto(new documents.TextRun(), {
      text: 'Hello ',
      linkKey: 'test',
    } as documents.TextRun.AsObject),
    makeProto(new documents.TextRun(), {
      text: 'World!',
      bold: true,
      linkKey: 'test',
    } as documents.TextRun.AsObject),
  ];

  const result: Array<documents.TextRun> = toTextRun(test);

  expect(result).to.have.length(2);
  expect(result).to.deep.equal(expected);
});

describe('toQuote', () => {
  it('default', () => {
    const test: SlateQuote = {
      id: 'test',
      type: 'quote',
      url: 'mintter://1234/5678',
      children: [{ text: '' }],
    };

    const quote = makeProto(new documents.Quote(), {
      linkKey: test.id,
      startOffset: 0,
      endOffset: 0,
    });
    expect(toQuote(test)).to.deep.equal(quote);
  });
});

describe('toInlineElement', () => {
  it('textRun', () => {
    const test: documents.TextRun = makeProto(new documents.TextRun(), {
      text: 'simple text',
      // bold: true,
    });

    const expected = new documents.InlineElement();
    expected.setTextRun(test);
    const result = toInlineElement({ textRun: test });

    expect(result).to.deep.equal(expected);
  });

  it('quote', () => {
    const test: documents.Quote = makeProto(new documents.Quote(), {
      linkKey: 'test://link',
      startOffset: 0,
      endOffset: 0,
    });

    const expected = new documents.InlineElement();
    expected.setQuote(test);

    expect(toInlineElement({ quote: test })).to.deep.equal(expected);
  });
});
