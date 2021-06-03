import type { TextRun, ListStyle, Block_Type } from '../../../../api/ts/documents/v1alpha/documents'

export type SlateVoidChildren = {
  children: Array<{ text: string }>;
};
export type EditorTextRun = Partial<Omit<TextRun, 'text'>> &
  Pick<TextRun, 'text'>;

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
  blockType?: Block_Type;
  listStyle: ListStyle;
  children: Array<EditorTextRun | SlateQuote | SlateLink>; // TODO: fix types
};
