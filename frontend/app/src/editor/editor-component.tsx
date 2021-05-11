import { KeyboardEvent, useState } from 'react';
import type { NodeEntry } from 'slate';
import {
  createBoldPlugin,
  createExitBreakPlugin,
  createHistoryPlugin,
  createNodeIdPlugin,
  createReactPlugin,
  createAutoformatPlugin,
  ELEMENT_PARAGRAPH,
  ExitBreakRule,
  MARK_BOLD,
  SlatePlugins,
  SlatePluginsProps,
  SPEditor,
  SlatePluginsOptions,
  DEFAULTS_BOLD,
  createSlatePluginsOptions,
  MARK_ITALIC,
  MARK_CODE,
  MARK_STRIKETHROUGH,
  createItalicPlugin,
  createStrikethroughPlugin,
  createCodePlugin,
} from '@udecode/slate-plugins';
import { createId } from '@utils/create-id';
import { createBlockPlugin, ELEMENT_BLOCK, blockOptions } from './block-plugin';
import { createElement } from './create-element';
import { boldOptions, boldAutoformatRules } from './bold-plugin';
import { codeOptions, codeAutoformatRules } from './code-plugin';
import { italicOptions, italicAutoformatRules } from './italic-plugin';
import {
  strikethroughOptions,
  strikethroughAutoformatRules,
} from './strikethrough-plugin';
import { Toolbar } from './toolbar';

const initialValue = [
  createElement('', {
    mark: 'bold',
    id: createId(),
    depth: 0,
    type: ELEMENT_BLOCK,
  }),
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
        id="editor"
        editableProps={{
          placeholder: 'start here...',
        }}
        plugins={[
          createReactPlugin(),
          createHistoryPlugin(),
          createBlockPlugin(),
          createAutoformatPlugin({
            rules: [
              ...boldAutoformatRules,
              ...italicAutoformatRules,
              ...codeAutoformatRules,
              ...strikethroughAutoformatRules,
              {
                type: MARK_STRIKETHROUGH,
                between: ['~~', '~~'],
                mode: 'inline',
                insertTrigger: true,
              },
            ],
          }),
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
          createBoldPlugin(),
          createItalicPlugin(),
          createStrikethroughPlugin(),
          createCodePlugin(),
        ]}
        options={{
          ...blockOptions,
          ...boldOptions,
          ...italicOptions,
          ...codeOptions,
          ...strikethroughOptions,
        }}
        initialValue={initialValue}
        onChange={(nv) => setV(nv as any)}
      ><Toolbar /></SlatePlugins>
      <pre>{JSON.stringify(v, null, 3)}</pre>
    </>
  );
}
