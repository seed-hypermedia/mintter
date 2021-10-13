import {Box} from '@mintter/ui/box'
import {PropsWithChildren, Suspense, useMemo} from 'react'
import type {Descendant} from 'slate'
import {Editable, Slate} from 'slate-react'
import {HoveringToolbar} from './hovering-toolbar'
import {
  buildDecorateHook,
  buildEditorHook,
  buildEventHandlerHooks,
  buildRenderElementHook,
  buildRenderLeafHook,
  EditorMode,
} from './plugin-utils'
import {plugins} from './plugins'

export type {EditorPlugin} from './types'

interface EditorProps {
  mode?: EditorMode
  value: Descendant[]
  onChange?: (value: Descendant[]) => void
}

export function Editor({value, onChange, children, mode = EditorMode.Draft}: PropsWithChildren<EditorProps>) {
  const editor = useMemo(() => buildEditorHook(plugins, mode), [mode])
  const renderElement = useMemo(() => buildRenderElementHook(plugins, editor), [mode])
  const renderLeaf = useMemo(() => buildRenderLeafHook(plugins, editor), [mode])
  const decorate = useMemo(() => buildDecorateHook(plugins, editor), [mode])
  const eventHandlers = useMemo(() => buildEventHandlerHooks(plugins, editor), [mode])

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <Suspense fallback={'loading'}>
        <Slate editor={editor} value={value} onChange={onChange}>
          <Editable
            style={{display: 'inline'}}
            readOnly={editor.readOnly}
            data-testid="editor-embed-mode"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            {...eventHandlers}
          />
        </Slate>
      </Suspense>
    )
  }

  if (mode == EditorMode.Publication) {
    return (
      <Suspense fallback={'loading'}>
        <Box
          css={{
            position: 'relative',
            marginLeft: '-$8',
          }}
        >
          <Slate editor={editor} value={value} onChange={onChange}>
            <Editable
              readOnly={editor.readOnly}
              data-testid="editor"
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              decorate={decorate}
              {...eventHandlers}
            />
            {children}
          </Slate>
        </Box>
      </Suspense>
    )
  }

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
            readOnly={editor.readOnly}
            data-testid="editor"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            {...eventHandlers}
          />
          {children}
        </Slate>
      </Box>
    </Suspense>
  )
}
