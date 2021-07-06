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
  useEditorState,
  useStoreEditorValue,
  useStoreEditorState,
} from '@udecode/slate-plugins'
import * as mock from '@mintter/client/mocks'
import {createBlockPlugin, ELEMENT_BLOCK, blockOptions} from './block-plugin'
import {boldOptions, boldAutoformatRules} from './bold-plugin'
import {codeOptions, codeAutoformatRules} from './code-plugin'
import {italicOptions, italicAutoformatRules} from './italic-plugin'
import {strikethroughOptions, strikethroughAutoformatRules} from './strikethrough-plugin'
import {Toolbar} from './toolbar'
import {underlineOptions, underlineAutoformatRules} from './underline-plugin'
import {createQuotePlugin, ELEMENT_QUOTE, quoteOptions} from './quote-plugin'
import {createLinkPlugin, ELEMENT_LINK, linkOptions} from './link-plugin'
import {useState, useEffect} from 'react'
// import {useMenuState} from 'reakit/Menu'

function rulesWithCustomDefaultType(
  type: string = ELEMENT_BLOCK,
  rules: ExitBreakRule[] = [
    {hotkey: 'mod+enter'},
    {
      hotkey: 'mod+shift+enter',
      before: true,
    },
  ],
): ExitBreakRule[] {
  return rules.map((rule) => ({
    ...rule,
    defaultType: type,
  }))
}

export function EditorComponent<T extends SPEditor = SPEditor>({
  value,
  id = 'editor',
  onChange,
  editableProps,
  ...options
}: SlatePluginsProps<T>) {
  // const menu = useMenuState()
  const [show, setShow] = useState(false)
  // const vvalue = useStoreEditorValue()
  // console.log('🚀 ~ file: editor-component.tsx ~ line 58 ~ vvalue', vvalue)

  useEffect(() => {
    if (!show && !!value) {
      setShow(true)
    } else {
    }
  }, [value])

  return show ? (
    <>
      <SlatePlugins
        id={id}
        initialValue={value}
        // onChange={onChange}
        editableProps={{
          ...editableProps,
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
              {hotkey: 'mod+enter'},
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
        {...options}
      >
        <Toolbar />
      </SlatePlugins>
    </>
  ) : null
}
