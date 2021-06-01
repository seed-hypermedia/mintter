import {
  SPEditor,
  upsertLinkAtSelection,
  WithOverride,
  someNode,
  isUrl,
} from '@udecode/slate-plugins';
import { useContext } from 'react';
import { Editor } from 'slate';
import { ReactEditor } from 'slate-react';
import { ELEMENT_LINK, MINTTER_LINK_PREFIX } from './create-link-plugin';

export interface WithMintterLinkOptions {
  openMintterLinkMenu: (coords: { x: number; y: number }) => void;
}

export function withMintterLink(
  options: WithMintterLinkOptions,
): WithOverride<ReactEditor & SPEditor> {
  return (editor) => {
    const { insertData, insertText } = editor;

    editor.insertData = (data) => {
      const text = data.getData('text/plain');
      const link = { url: text, wrap: false };

      if (text) {
        if (someNode(editor, { match: { type: ELEMENT_LINK } })) {
          return insertText(text);
        }

        if (text.includes(MINTTER_LINK_PREFIX)) {
          console.log('this is a mintter link => ', text, editor.selection);

          // const range = editor.selection && ReactEditor.toDOMRange(editor, editor.selection)
          // const rect = range?.getBoundingClientRect()

          // if (rect) {
          options.openMintterLinkMenu();
          // }

          return upsertLinkAtSelection(editor, link);
        }

        if (isUrl(text)) {
          console.log('link inserted at => ', editor.selection);
          return upsertLinkAtSelection(editor, link);
        }
      }

      insertData(data);
    };

    return editor;
  };
}
