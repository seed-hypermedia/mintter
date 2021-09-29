import {Box} from '@mintter/ui/box'
import {lazy, Suspense, useMemo, useState} from 'react'
import type {Descendant} from 'slate'
import {Editable, Slate} from 'slate-react'
import {HoveringToolbar} from './hovering-toolbar'
import {
  buildDecorateHook,
  buildEditorHook,
  buildEventHandlerHooks,
  buildRenderElementHook,
  buildRenderLeafHook,
} from './plugin-utils'
import {plugins} from './plugins'

export type {EditorPlugin} from './types'

interface AsyncEditorProps {
  mode: string
  value: Descendant[]
  onChange: (value: Descendant[]) => void
  children?: unknown
  readOnly?: boolean
}

const AsyncEditor = lazy(async () => {
  const resolvedPlugins = await Promise.all(plugins)

  return {
    default: function AsyncEditor({value, onChange, mode, children, readOnly}: AsyncEditorProps) {
      const editor = useMemo(() => buildEditorHook(resolvedPlugins, mode), [])
      const renderElement = useMemo(() => buildRenderElementHook(resolvedPlugins, mode), [mode])
      const renderLeaf = useMemo(() => buildRenderLeafHook(resolvedPlugins, mode), [mode])
      const decorate = useMemo(() => buildDecorateHook(resolvedPlugins, mode), [mode])
      const eventHandlers = useMemo(() => buildEventHandlerHooks(resolvedPlugins, mode), [mode])

      return (
        <Slate editor={editor} value={value} onChange={onChange}>
          <HoveringToolbar />
          <Editable
            readOnly={readOnly}
            data-testid="editor"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            {...eventHandlers}
          />
          {children}
        </Slate>
      )
    },
  }
})

interface EditorProps {
  mode?: string
  value: Descendant[]
  onChange: (value: Descendant[]) => void
  children?: unknown
  readOnly?: boolean
}

export function Editor({
  value,
  onChange,
  children,
  readOnly = false,
  mode = readOnly ? 'read-only' : 'default',
}: EditorProps): JSX.Element {
  const [visible, setVisible] = useState(false)

  return (
    <Suspense fallback={'loading'}>
      <Box
        css={{
          position: 'relative',
          marginLeft: '-$8',
        }}
      >
        <AsyncEditor value={value} onChange={onChange} mode={mode} readOnly={readOnly}>
          {children}
        </AsyncEditor>

        <Box css={{marginTop: 40}}>
          <button type="button" onClick={() => setVisible((v) => !v)}>
            toggle Value
          </button>
          {visible && (
            <Box
              as="pre"
              css={{
                padding: 20,
                backgroundColor: '$background-muted',
                overflowX: 'scroll',
              }}
            >
              {JSON.stringify(value, null, 2)}
            </Box>
          )}
        </Box>
      </Box>
    </Suspense>
  )
}
