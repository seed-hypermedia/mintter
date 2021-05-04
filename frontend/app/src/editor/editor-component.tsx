import { KeyboardEvent, useState } from 'react';
import type { NodeEntry } from 'slate';
import {
  createExitBreakPlugin,
  createHistoryPlugin,
  createNodeIdPlugin,
  createReactPlugin,
  ELEMENT_PARAGRAPH,
  ExitBreakRule,
  SlatePlugins,
  SlatePluginsProps,
  SPEditor,
} from '@udecode/slate-plugins';
import { createId } from '@utils/create-id';
import { createBlockPlugin, ELEMENT_BLOCK, BlockElement } from './block-plugin';
import { createElement } from './create-element';

const initialValue = [
  createElement('', { id: createId(), type: ELEMENT_BLOCK }),
];

function rulesWithCustomDefaultType(
  type: string = ELEMENT_BLOCK,
  rules: ExitBreakRule[] = [
    { hotkey: 'mod+enter' },
    {
      hotkey: 'mod+shift+enter',
      before: true,
    },
  ],
): ExitBreakRule[] {
  return rules.map((rule) => ({
    ...rule,
    defaultType: type,
  }));
}

export function EditorComponent<T extends SPEditor = SPEditor>({
  ...options
}: SlatePluginsProps<T>) {
  const [v, setV] = useState(initialValue);
  return (
    <>
      <SlatePlugins
        editableProps={{
          placeholder: 'start here...',
        }}
        plugins={[
          createReactPlugin(),
          createHistoryPlugin(),
          createBlockPlugin(),
          createExitBreakPlugin({
            rules: rulesWithCustomDefaultType(ELEMENT_BLOCK, [
              { hotkey: 'mod+enter' },
              {
                hotkey: 'mod+shift+enter',
                before: true,
              },
              {
                hotkey: 'enter',
                query: {
                  start: true,
                  end: true,
                  allow: [ELEMENT_BLOCK],
                },
              },
            ]),
          }),
        ]}
        initialValue={initialValue}
        components={{ [ELEMENT_BLOCK]: BlockElement }}
        onChange={(nv) => setV(nv as any)}
      />
      <pre>{JSON.stringify(v, null, 3)}</pre>
    </>
  );
}
