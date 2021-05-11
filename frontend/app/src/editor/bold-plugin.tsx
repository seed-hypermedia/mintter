import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import { DEFAULTS_BOLD, MARK_BOLD } from '@udecode/slate-plugins-basic-marks';
import type { SlatePluginOptions } from '@udecode/slate-plugins-core';

export type BoldOptions = {
  [MARK_BOLD]: SlatePluginOptions;
};

export const boldOptions: BoldOptions = {
  [MARK_BOLD]: {
    ...DEFAULTS_BOLD,
    component: BoldLeaf,
  },
};

export const boldAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_BOLD,
    between: ['**', '**'],
    mode: 'inline',
    insertTrigger: true,
  },
  // {
  //   type: MARK_BOLD,
  //   between: ['__', '__'],
  //   mode: 'inline',
  //   insertTrigger: true,
  // },
];
const styleClass = css({
  fontWeight: '$bold',
});

export function BoldLeaf({ attributes, children, leaf, ...rest }) {
  if (leaf.bold) {
    return (
      <strong className={styleClass()} {...attributes}>
        {children}
      </strong>
    );
  }
}
