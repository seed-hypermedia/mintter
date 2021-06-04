import { Box } from '@mintter/ui/box';
import type { AutoformatRule } from '@udecode/slate-plugins-autoformat';
import { DEFAULTS_BOLD, MARK_BOLD } from '@udecode/slate-plugins-basic-marks';
import type {
  SlatePluginComponent,
  SlatePluginOptions,
  SPRenderLeafProps,
} from '@udecode/slate-plugins-core';
import type { EditorTextRun } from './types';

export type BoldOptions = {
  [MARK_BOLD]: SlatePluginOptions;
};

export const boldOptions: BoldOptions = {
  //@ts-ignore
  [MARK_BOLD]: {
    ...DEFAULTS_BOLD,
    component: BoldLeaf as SlatePluginComponent,
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

export function BoldLeaf({
  attributes,
  children,
  leaf,
  ...rest
}: SPRenderLeafProps<EditorTextRun>) {
  if (leaf.bold) {
    return (
      <Box
        as="strong"
        //@ts-ignore
        css={{
          fontWeight: '$bold',
        }}
        {...attributes}
      >
        {children}
      </Box>
    );
  }
}
