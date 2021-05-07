import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import {
  DEFAULTS_STRIKETHROUGH,
  MARK_STRIKETHROUGH,
} from '@udecode/slate-plugins-basic-marks';
import type { SlatePluginOptions } from '@udecode/slate-plugins-core';

export type StrikethroughOptions = {
  [MARK_STRIKETHROUGH]: SlatePluginOptions;
};

export const strikethroughOptions: StrikethroughOptions = {
  [MARK_STRIKETHROUGH]: {
    ...DEFAULTS_STRIKETHROUGH,
    component: StrikethroughLeaf,
  },
};

export const strikethroughAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_STRIKETHROUGH,
    between: ['`', '`'],
    mode: 'inline',
    insertTrigger: true,
  },
];

const styleClass = css({});

export function StrikethroughLeaf({ attributes, children, leaf, ...rest }) {
  if (leaf.code) {
    return (
      <code className={styleClass()} {...attributes}>
        {children}
      </code>
    );
  }
}
