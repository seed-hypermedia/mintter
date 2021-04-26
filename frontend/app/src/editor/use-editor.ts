import { withAutoformat, pipe, withInlineVoid } from '@udecode/slate-plugins';
import * as React from 'react';
import { createEditor, Editor } from 'slate';
import { withHistory } from 'slate-history';
import { withReact } from 'slate-react';

import { autoformatRules } from '../editor/autoformat-rules';
import { withMintter } from '../editor/mintter-plugin/with-mintter';
import { withLinks } from './link-plugin';

// TODO: fix types
export function useEditor(plugins: any[], options: any): Editor {
  return React.useMemo(
    () =>
      pipe(
        createEditor(),
        ...([
          withReact,
          withHistory,
          withLinks(options),
          withAutoformat({
            rules: autoformatRules,
          }),
          // withDeserializeMd(plugins),
          withInlineVoid({ plugins }),
          withMintter({ plugins, options }),
        ] as const),
      ),
    [options, plugins],
  );
}
