import { css } from '@mintter/ui/stitches.config';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import {
  DEFAULTS_UNDERLINE,
  MARK_UNDERLINE,
} from '@udecode/slate-plugins-basic-marks';
import type {
  SlatePluginComponent,
  SlatePluginOptions,
  SPRenderLeafProps,
} from '@udecode/slate-plugins-core';
import type { EditorTextRun } from './types';

export type UnderlineOptions = {
  [MARK_UNDERLINE]: SlatePluginOptions;
};

export const underlineOptions: UnderlineOptions = {
  //@ts-ignore
  [MARK_UNDERLINE]: {
    ...DEFAULTS_UNDERLINE,
    component: UnderlineLeaf as SlatePluginComponent,
  },
};

export const underlineAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_UNDERLINE,
    between: ['__', '__'],
    mode: 'inline',
    insertTrigger: true,
  },
];

const styleClass = css({
  textDecoration: 'underline',
});

export function UnderlineLeaf({
  attributes,
  children,
  leaf,
  ...rest
}: SPRenderLeafProps<EditorTextRun>) {
  console.log('UNDERLINE LEAF', leaf);
  if (leaf.underline) {
    console.log('UNDERLINE!!!');
    return (
      <span className={styleClass()} {...attributes}>
        {children}
      </span>
    );
  }
}
