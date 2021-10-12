import {Box} from '@mintter/ui/box'
import {PropsWithChildren, Suspense, useMemo, useState} from 'react'
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

interface EditorProps {
  mode?: EditorMode
  value: Descendant[]
  onChange: (value: Descendant[]) => void
  readOnly?: boolean
}

export function Editor({value, onChange, children, mode = EditorMode.Draft}: PropsWithChildren<EditorProps>) {
  const [visible, setVisible] = useState(false)

  const editor = useMemo(() => buildEditorHook(plugins, mode), [mode])
  const renderElement = useMemo(() => buildRenderElementHook(plugins, mode), [mode])
  const renderLeaf = useMemo(() => buildRenderLeafHook(plugins, mode), [mode])
  const decorate = useMemo(() => buildDecorateHook(plugins, mode), [mode])
  const eventHandlers = useMemo(() => buildEventHandlerHooks(plugins, mode), [mode])

  return (
    <Suspense fallback={'loading'}>
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
            data-testid="editor"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            {...eventHandlers}
          />
          {children}
        </Slate>

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
