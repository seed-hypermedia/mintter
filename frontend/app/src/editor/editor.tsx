import {useHover} from '@app/editor/hover-context'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {ChildrenOf, Document, FlowContent} from '@mintter/mttast'
import {PropsWithChildren, Suspense, useMemo} from 'react'
import type {Descendant, Editor as EditorType} from 'slate'
import {Editable, Slate} from 'slate-react'
import {EditorHoveringToolbar} from './editor-hovering-toolbar'
import {
  buildDecorateHook,
  buildEditorHook,
  buildEventHandlerHooks,
  buildRenderElementHook,
  buildRenderLeafHook,
  EditorMode,
} from './plugin-utils'
import {plugins as defaultPlugins} from './plugins'
import type {EditorPlugin} from './types'

interface EditorProps {
  mode?: EditorMode
  value: ChildrenOf<Document> | Array<FlowContent>
  onChange?: (value: Descendant[]) => void
  editor?: EditorType
  plugins?: Array<EditorPlugin>
  as?: any
  className?: string
}

const editorWrapperStyles = css({
  position: 'relative',
})

export function Editor({
  value,
  onChange,
  children,
  mode = EditorMode.Draft,
  editor,
  plugins = defaultPlugins,
  as = 'div',
  className,
}: PropsWithChildren<EditorProps>) {
  const _editor = useMemo(
    () => editor ?? buildEditorHook(plugins, mode),
    [editor, plugins, mode],
  )
  const renderElement = useMemo(
    () => buildRenderElementHook(plugins, _editor),
    [plugins, _editor],
  )
  const renderLeaf = useMemo(
    () => buildRenderLeafHook(plugins, _editor),
    [plugins, _editor],
  )
  const decorate = useMemo(
    () => buildDecorateHook(plugins, _editor),
    [plugins, _editor],
  )
  const eventHandlers = useMemo(
    () => buildEventHandlerHooks(plugins, _editor),
    [plugins, _editor],
  )
  const hoverService = useHover()

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <Suspense fallback={'loading'}>
        <Box
          as="span"
          className={className}
          onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
        >
          <Slate
            editor={_editor}
            value={value as Array<Descendant>}
            onChange={onChange as any}
          >
            <Editable
              as={as}
              data-testid="editor"
              style={{display: 'inline'}}
              readOnly={_editor.readOnly}
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              decorate={decorate}
              {...eventHandlers}
            />
          </Slate>
        </Box>
      </Suspense>
    )
  }

  if (mode == EditorMode.Publication || mode == EditorMode.Discussion) {
    console.log('Editor: ', _editor)

    return (
      <Suspense fallback={'loading'}>
        <Box
          className={className}
          css={{position: 'relative'}}
          onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
        >
          <Slate
            editor={_editor}
            value={value as Array<Descendant>}
            onChange={onChange as any}
          >
            {/* <PublicationHoveringToolbar /> */}
            <Editable
              readOnly={_editor.readOnly}
              data-testid="editor"
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              decorate={decorate}
              placeholder="Start typing here..."
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
        className={className}
        css={{position: 'relative'}}
        onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
      >
        <Slate
          editor={_editor}
          value={value as Array<Descendant>}
          onChange={onChange as any}
        >
          <EditorHoveringToolbar />
          <Editable
            spellCheck={false}
            autoCorrect="false"
            autoCapitalize="false"
            data-testid="editor"
            readOnly={_editor.readOnly}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            placeholder="Start typing here..."
            {...eventHandlers}
          />
          {children}
        </Slate>
      </Box>
    </Suspense>
  )
}
