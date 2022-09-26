import {useHover} from '@app/editor/hover-context'
import {
  blockquote,
  ChildrenOf,
  code,
  Document,
  FlowContent,
  group,
  heading,
  isFlowContent,
  ol,
  statement,
  ul,
} from '@app/mttast'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Event, listen} from '@tauri-apps/api/event'
import {PropsWithChildren, useEffect, useMemo} from 'react'
import {Descendant, Editor as EditorType} from 'slate'
import {Editable, Slate} from 'slate-react'
import {EditorHoveringToolbar} from './hovering-toolbar'
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
import {setList, setType, toggleFormat} from './utils'

interface EditorProps {
  mode?: EditorMode
  value: ChildrenOf<Document> | Array<FlowContent>
  onChange?: (value: Descendant[]) => void
  editor?: EditorType
  plugins?: Array<EditorPlugin>
  as?: unknown
  className?: string
}

const editorWrapperStyles = css({
  position: 'relative',
  userSelect: 'none',
  '& [data-slate-placeholder="true"]': {
    // this is needed to make sure the placeholder does not wrap the text.
    whiteSpace: 'nowrap',
  },
  variants: {
    mode: {
      [EditorMode.Discussion]: {
        fontSize: '0.9rem',
      },
      [EditorMode.Draft]: {
        display: 'block',
        paddingBlockStart: '1rem',
        marginInlineStart: '1rem',
      },
      [EditorMode.Embed]: {},
      [EditorMode.Mention]: {},
      [EditorMode.Publication]: {
        display: 'block',
        paddingBlockStart: '1rem',
      },
    },
  },
})

export function Editor({
  value,
  onChange,
  children,
  mode = EditorMode.Draft,
  editor,
  plugins = defaultPlugins,
  as = 'div',
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

  useEffect(() => {
    let isSubscribed = true
    let unlisten

    listen('format_mark', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }
      console.log('set mark', event.payload)

      toggleFormat(_editor, event.payload)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten

    listen('format_block', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      if (!_editor.selection) return

      const set = setType(
        {
          heading,
          statement,
          blockquote,
          codeblock: code,
        }[event.payload],
      )

      const [el, path] =
        EditorType.above(_editor, {
          at: _editor.selection,
          match: isFlowContent,
        }) || []

      if (!el || !path) throw new Error('whut')

      set(_editor, el, path)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten

    listen('format_list', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      if (!_editor.selection) return

      const set = setList(
        {
          ordered_list: ol,
          unordered_list: ul,
          group,
        }[event.payload],
      )

      const [el, path] =
        EditorType.above(_editor, {
          at: _editor.selection,
          match: isFlowContent,
        }) || []

      if (!el || !path) throw new Error('whut')

      set(_editor, el, path)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  if (mode == EditorMode.Draft) {
    return (
      <Box className={editorWrapperStyles({mode})} id="editor">
        <Slate
          editor={_editor}
          value={value as Array<Descendant>}
          onChange={onChange}
        >
          <EditorHoveringToolbar />
          <Editable
            spellCheck={false}
            autoCorrect="false"
            autoCapitalize="false"
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
    )
  }

  return (
    <Box
      as="span"
      className={editorWrapperStyles({mode})}
      id="editor"
      onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
    >
      <Slate
        editor={_editor}
        value={value as Array<Descendant>}
        onChange={onChange}
      >
        {/* {mode == EditorMode.Publication ? (
            <PublicationHoveringToolbar />
          ) : null} */}
        <Editable
          as={as}
          data-testid="editor"
          style={{display: 'inline'}}
          readOnly
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={decorate}
          {...eventHandlers}
        />
      </Slate>
    </Box>
  )
}
