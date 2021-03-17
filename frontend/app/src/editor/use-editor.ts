import * as React from 'react';
import { createEditor, Editor } from 'slate';
import { withReact } from 'slate-react';
import { withAutoformat, pipe, withInlineVoid } from '@udecode/slate-plugins';
import { withHistory } from 'slate-history';
import { autoformatRules } from '../editor/autoformat-rules';
import { withMintter } from '../editor/mintter-plugin/with-mintter';
import { withLinks } from './link-plugin';

// TODO: fix types
export function useEditor(plugins: any[], options: any): Editor {
  const withPlugins = [
    withReact,
    withHistory,
    withLinks(options),
    withAutoformat({
      rules: autoformatRules,
    }),
    // withDeserializeMd(plugins),
    withInlineVoid({ plugins }),
    withMintter({ plugins, options }),
  ] as const;

  return React.useMemo(() => pipe(createEditor(), ...withPlugins), []);
}
