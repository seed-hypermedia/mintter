import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';

export type SlateVoidChildren = {
  children: Array<{ text: string }>;
};
export type EditorTextRun = Partial<Omit<documents.TextRun.AsObject, 'text'>> &
  Pick<documents.TextRun.AsObject, 'text'>;

export type SlateQuote = SlateVoidChildren & {
  type: string;
  id: string;
  url: string;
};

export type SlateImage = SlateVoidChildren & {
  type: string;
  url: string;
  alt_text: string;
};

export type SlateInlineElement = EditorTextRun | SlateQuote | SlateImage;

export type SlateLink = {
  type: string;
  id: string;
  url: string;
  children: EditorTextRun[];
};

export type SlateBlock = {
  type: string;
  id: string;
  depth: number;
  blockType: documents.Block.Type;
  listStyle: documents.ListStyle;
  children: Array<EditorTextRun | SlateQuote | SlateLink>; // TODO: fix types
};
