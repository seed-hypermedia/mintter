import {
  getAbove,
  selectEndOfBlockAboveSelection,
} from '@udecode/slate-plugins-common';
import type { SPEditor } from '@udecode/slate-plugins-core';
import { Editor, Path, Transforms } from 'slate';
import type { ReactEditor } from 'slate-react';
import { ELEMENT_LINK } from '../link-plugin';
import type { SlateLink, SlateQuote } from '../types';
import { ELEMENT_QUOTE } from './create-quote-plugin';

export function createQuoteFromLink(editor: ReactEditor & SPEditor) {
  const link = getAbove<SlateLink>(editor, { match: { type: ELEMENT_LINK } });
  if (!link) return;
  const [linkNode, linkPath] = link;
  Editor.withoutNormalizing(editor, () => {
    Transforms.removeNodes(editor, { at: linkPath });
    Transforms.insertNodes<SlateQuote>(
      editor,
      {
        id: linkNode.id,
        url: linkNode.url,
        type: ELEMENT_QUOTE,
        children: [{ text: '' }],
      } as Partial<SlateQuote>,
      { at: linkPath, select: true },
    );
  });
}
