import { TextRun, Link, Quote, InlineElement } from '@mintter/client';
import {
  toTextRun,
  toLink,
  toQuote,
  toInlineElement,
} from './inline-element';
import type { EditorLink, EditorQuote } from './types';

describe('TextRun', () => {
  it('simple text', () => {
    const test = {
      text: 'plain text',
    };
    const expected = TextRun.fromPartial(test)

    const result = toTextRun(test);
    expect(result).toEqual(expected)
  });

  it('text with attributes', () => {
    const test = {
      text: 'text with attributes',
      bold: true,
      underline: true,
    };
    const expected = TextRun.fromPartial(test)

    const result = toTextRun(test);
    expect(result).toEqual(expected);
  });
});

describe('toLink', () => {
  it('simple link', () => {
    const test: EditorLink = {
      id: 'test',
      type: 'a',
      url: 'https://example.test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };
    const expected = Link.fromPartial({ uri: test.url })

    expect(toLink(test)).toEqual(expected);
  });

  it('link with no id', () => {
    const test: Partial<EditorLink> = {
      type: 'a',
      url: 'https://example.test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };

    const expected = `toLink error: "id" cannot be undefined`;
    expect(() => toLink(test as any)).toThrow(expected);
  });
  it('link with no url', () => {
    const test: Partial<EditorLink> = {
      type: 'a',
      id: 'test',
      children: [
        {
          text: 'plain link',
        },
      ],
    };
    const expected = `toLink error: "url" cannot be undefined`;
    expect(() => toLink(test as any)).toThrow(expected);
  });
});

describe('toQuote', () => {
  it('default', () => {
    const test: EditorQuote = {
      id: 'test',
      type: 'quote',
      url: 'mintter://1234/5678',
      children: [{ text: '' }],
    };

    const expected = Quote.fromPartial({
      linkKey: test.id,
      startOffset: 0,
      endOffset: 0,
    })

    expect(toQuote(test)).toEqual(expected);
  });
});

describe('toInlineElement', () => {
  it('textRun', () => {
    const test = TextRun.fromPartial({
      text: 'simple text'
    })

    const expected = InlineElement.fromPartial({
      textRun: test
    });
    const result = toInlineElement({ textRun: test });

    expect(result).toEqual(expected);
  });

  it('quote', () => {
    const test = Quote.fromPartial({
      linkKey: 'test://link',
      startOffset: 0,
      endOffset: 0
    })

    const expected = InlineElement.fromPartial({ quote: test });

    expect(toInlineElement({ quote: test })).toEqual(expected);
  });
});
