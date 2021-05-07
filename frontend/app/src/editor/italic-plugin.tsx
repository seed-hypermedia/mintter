import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import {
  DEFAULTS_ITALIC,
  MARK_ITALIC,
} from '@udecode/slate-plugins-basic-marks';
import type { SlatePluginOptions } from '@udecode/slate-plugins-core';

export type ItalicOptions = {
  [MARK_ITALIC]: SlatePluginOptions;
};

export const italicOptions: ItalicOptions = {
  [MARK_ITALIC]: {
    ...DEFAULTS_ITALIC,
    component: ItalicLeaf,
  },
};

export const italicAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_ITALIC,
    between: ['*', '*'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_ITALIC,
    between: ['_', '_'],
    mode: 'inline',
    insertTrigger: true,
  },
];
const styleClass = css({
  fontStyle: 'italic',
});

export function ItalicLeaf({ attributes, children, leaf, ...rest }) {
  if (leaf.italic) {
    return (
      <em className={styleClass()} {...attributes}>
        {children}
      </em>
    );
  }
}
