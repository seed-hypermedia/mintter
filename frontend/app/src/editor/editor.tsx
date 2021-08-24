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
import {plugins as defaultPlugins} from './plugins'

export type {EditorPlugin} from './types'

interface EditorProps {
  mode?: string
  plugins?: EditorPlugin[]
  value: Descendant[]
  onChange: (value: Descendant[]) => void
  children?: unknown
  readOnly?: boolean
  sidepanelSend: any
}

export function Editor({
  value,
  onChange,
  children,
  readOnly = false,
  plugins = defaultPlugins,
  mode = readOnly ? 'read-only' : 'default',
  sidepanelSend,
}: EditorProps): JSX.Element {
  const editor = useMemo(() => buildEditorHook(plugins, mode), [plugins])
  const renderElement = useMemo(() => buildRenderElementHook(plugins, mode), [plugins])
  const renderLeaf = useMemo(() => buildRenderLeafHook(plugins, mode), [plugins])
  const decorate = useMemo(() => buildDecorateHook(plugins, mode), [plugins])

  const eventHandlers = useMemo(
    () => Object.fromEntries(getUsedEventHandlers(plugins).map((ev) => [ev, buildEventHandlerHook(plugins, ev, mode)])),
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
        <Editable
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={decorate}
          {...eventHandlers}
        />
        {children}
      </Slate>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </Box>
  )
}
