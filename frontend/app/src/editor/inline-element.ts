import { TextRun, Quote, Image, InlineElement, Link } from '@mintter/client'
import type { EditorTextRun, EditorQuote, EditorLink } from './types';

export type EntryInlineElementTextRun = {
  textRun: TextRun;
};

export type EntryInlineElementQuote = {
  quote: Quote;
};

export type EntryInlineElementImage = {
  image: Image;
};

export function toInlineElement(
  entry:
    | EntryInlineElementTextRun
    | EntryInlineElementQuote
    | EntryInlineElementImage,
) {
  if (Object.keys(entry).length > 1) {
    throw Error(
      `toInlineElement Error: invalid entry. you should send just oneOf the content type`,
    );
  }

  if ('textRun' in entry || 'quote' in entry || 'image' in entry) {
    return InlineElement.fromPartial(entry)
  } else {
    throw new Error(`toInlineElement Error: invalid entry. Expected oneof textRun, quote or image but got "${entry}"`,)
  }
}

export function toTextRun(entry: EditorTextRun): TextRun {
  return TextRun.fromPartial(entry)
}

export function toInlineQuote(quote: Quote): InlineElement {
  return InlineElement.fromPartial({
    quote
  })
}

export type ToQuoteResult = {
  id: string;
  quote: Quote;
  link: Link;
};

export function toQuote(entry: EditorQuote): Quote {
  return Quote.fromPartial({
    linkKey: entry.id,
    startOffset: 0,
    endOffset: 0
  })
}


export function toLink(entry: Partial<EditorLink> & Pick<EditorLink, 'id' | 'url'>): Link {
  if (!entry.id) {
    throw Error(`toLink error: "id" cannot be undefined`);
  }

  if (!entry.url) {
    throw Error(`toLink error: "url" cannot be undefined`);
  }
  return Link.fromPartial({
    uri: entry.url
  })
}
