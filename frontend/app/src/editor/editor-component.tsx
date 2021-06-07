import {
  createBoldPlugin,
  createExitBreakPlugin,
  createHistoryPlugin,
  createReactPlugin,
  createAutoformatPlugin,
  ExitBreakRule,
  SlatePlugins,
  SlatePluginsProps,
  SPEditor,
  createItalicPlugin,
  createStrikethroughPlugin,
  createCodePlugin,
  createUnderlinePlugin,
  withNodeId,
} from '@udecode/slate-plugins'
import { mock } from '@mintter/client'
import { createBlockPlugin, ELEMENT_BLOCK, blockOptions } from './block-plugin'
import { boldOptions, boldAutoformatRules } from './bold-plugin'
import { codeOptions, codeAutoformatRules } from './code-plugin'
import { italicOptions, italicAutoformatRules } from './italic-plugin'
import { Block_Type } from '@mintter/api/documents/v1alpha/documents'
import {
  strikethroughOptions,
  strikethroughAutoformatRules,
} from './strikethrough-plugin'
import { Toolbar } from './toolbar'
import { underlineOptions, underlineAutoformatRules } from './underline-plugin'
import { createQuotePlugin, ELEMENT_QUOTE, quoteOptions } from './quote-plugin'
import {
  createLinkPlugin,
  ELEMENT_LINK,
  linkOptions,
  // LinkMenu,
} from './link-plugin'
// import {useMenuState} from 'reakit/Menu'

const initialValue = [
  {
    id: mock.createId(),
    depth: 0,
    type: ELEMENT_BLOCK,
    children: [
      {
        text: 'Hello world ',
      },
      // {
      //   type: 'quote',
      //   id: createId(),
      //   url: `${createId()}/${createId()}`,
      //   children: [{ text: '' }],
      // },
      {
        type: ELEMENT_LINK,
        url: 'https://mintter.com',
        id: mock.createId(),
        children: [{ text: 'link here' }],
      },
    ],
  },
  {
    type: ELEMENT_BLOCK,
    blockType: Block_Type.BASIC,
    depth: 0,
    id: mock.createId(),
    children: [
      {
        text: 'Heading 2',
      },
    ],
  },
]

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
  return rules.map(rule => ({
    ...rule,
    defaultType: type,
  }))
}

export function EditorComponent<T extends SPEditor = SPEditor>({
  initialValue,
  ...options
}: SlatePluginsProps<T>) {
  // const menu = useMenuState({loop: true, wrap: true})

  return (
    <>
      <SlatePlugins
        id="editor"
        {...options}
        initialValue={initialValue}
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
              ...underlineAutoformatRules,
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
          createUnderlinePlugin(),
          createQuotePlugin(),
          // createLinkPlugin({menu}),
          createLinkPlugin(),
          {
            withOverrides: withNodeId({
              idCreator: () => mock.createId(),
              allow: [ELEMENT_LINK, ELEMENT_QUOTE],
            }),
          },
        ]}
        options={{
          ...blockOptions,
          ...boldOptions,
          ...italicOptions,
          ...codeOptions,
          ...strikethroughOptions,
          ...underlineOptions,
          ...quoteOptions,
          ...linkOptions,
        }}
      >
        <Toolbar />
        {/* <LinkMenu menu={menu} /> */}
      </SlatePlugins>
    </>
  )
}
