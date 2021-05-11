import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import { DEFAULTS_UNDERLINE, MARK_UNDERLINE } from '@udecode/slate-plugins-basic-marks';
import type { SlatePluginOptions } from '@udecode/slate-plugins-core';

export type UnderlineOptions = {
  [MARK_UNDERLINE]: SlatePluginOptions;
};

export const underlineOptions: UnderlineOptions = {
  [MARK_UNDERLINE]: {
    ...DEFAULTS_UNDERLINE,
    component: UnderlineLeaf,
  },
};

export const underlineAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_UNDERLINE,
    between: ['__', '__'],
    mode: 'inline',
    insertTrigger: true,
  }
];

const styleClass = css({
  textDecoration: 'underline'
});

export function UnderlineLeaf({ attributes, children, leaf, ...rest }) {
  console.log('UNDERLINE LEAF', leaf)
  if (leaf.underline) {
    console.log("UNDERLINE!!!")
    return (
      <span className={styleClass()} {...attributes}>
        {children}
      </span>
    );
  }
}
