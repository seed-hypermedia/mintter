import {useState, useEffect, useRef, useCallback} from 'react'
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
import {Box} from '@mintter/ui'
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
  // const vvalue = useStoreEditorValue()
  // console.log('🚀 ~ file: editor-component.tsx ~ line 58 ~ vvalue', vvalue)
  const [contentIsAvaliable, setContentIsAvaliable] = useState(false)

  // this is important
  useEffect(() => {
    if (!contentIsAvaliable && !!value) {
      setContentIsAvaliable(true)
    } else {
    }
  }, [value])

  return contentIsAvaliable ? (
    <Box>
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
    </Box>
  ) : null
}

function useEventListener(eventName, handler, element = window) {
  // Create a ref that stores handler
  const savedHandler = useRef()
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])
  useEffect(
    () => {
      // Make sure element supports addEventListener
      // On
      const isSupported = element && element.addEventListener
      if (!isSupported) return
      // Create event listener that calls handler function stored in ref
      const eventListener = (event) => savedHandler.current(event)
      // Add event listener
      element.addEventListener(eventName, eventListener)
      // Remove event listener on cleanup
      return () => {
        element.removeEventListener(eventName, eventListener)
      }
    },
    [eventName, element], // Re-run if eventName or element changes
  )
}
