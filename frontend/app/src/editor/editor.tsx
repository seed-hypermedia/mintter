import {useMemo} from 'react'
import type {Descendant} from 'slate'
import {Slate, Editable} from 'slate-react'
import type {EditorPlugin} from './types'
import {
  buildEditorHook,
  buildRenderElementHook,
  buildRenderLeafHook,
  buildDecorateHook,
  buildEventHandlerHook,
  getUsedEventHandlers,
} from './plugin-utils'
import {HoveringToolbar} from './hovering-toolbar'
import {Box} from '@mintter/ui/box'

export type {EditorPlugin} from './types'

interface EditorProps {
  plugins?: EditorPlugin[]
  value: Descendant[]
  onChange: (value: Descendant[]) => void
  children?: unknown
}

export function Editor({plugins = [], value, onChange, children}: EditorProps): JSX.Element {
  const editor = useMemo(() => buildEditorHook(plugins), [plugins])
  const renderElement = useMemo(() => buildRenderElementHook(plugins), [plugins])
  const renderLeaf = useMemo(() => buildRenderLeafHook(plugins), [plugins])
  const decorate = useMemo(() => buildDecorateHook(plugins), [plugins])

  const eventHandlers = useMemo(
    () =>
      Object.fromEntries(getUsedEventHandlers(plugins).map((ev) => [ev, buildEventHandlerHook(plugins, ev, editor)])),
    [plugins],
  )

  return (
    <Box
      css={{
        position: 'relative',
        marginLeft: '-$8',
      }}
    >
      <Slate editor={editor} value={value} onChange={onChange}>
        <HoveringToolbar />
        <Editable renderElement={renderElement} renderLeaf={renderLeaf} decorate={decorate} {...eventHandlers} />
        {children}
      </Slate>
      <pre>{JSON.stringify(editor.children, null, 2)}</pre>
    </Box>
  )
}
