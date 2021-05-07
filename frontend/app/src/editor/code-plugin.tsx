import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import { DEFAULTS_CODE, MARK_CODE } from '@udecode/slate-plugins-basic-marks';
import type { SlatePluginOptions } from '@udecode/slate-plugins-core';

export type CodeOptions = {
  [MARK_CODE]: SlatePluginOptions;
};

export const codeOptions: CodeOptions = {
  [MARK_CODE]: {
    ...DEFAULTS_CODE,
    component: CodeLeaf,
  },
};

export const codeAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_CODE,
    between: ['`', '`'],
    mode: 'inline',
    insertTrigger: true,
  },
];

const styleClass = css({
  paddingHorizontal: '$3',
  paddingVetical: '$3',
  fontSize: '$2',
  backgroundColor: '$background-contrast-strong',
  borderRadius: '$2',
  color: '$text-contrast',
});

export function CodeLeaf({ attributes, children, leaf, ...rest }) {
  if (leaf.code) {
    return (
      <code className={styleClass()} {...attributes}>
        {children}
      </code>
    );
  }
}
