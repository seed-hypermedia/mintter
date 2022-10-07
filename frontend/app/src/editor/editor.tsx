import {EditorHoveringToolbar} from '@app/editor/hovering-toolbar'
import {
  blockquote,
  ChildrenOf,
  code,
  Document,
  FlowContent,
  group,
  heading,
  isFlowContent,
  isMark,
  ol,
  statement,
  ul,
} from '@app/mttast'
import {flow} from '@app/stitches.config'
import {classnames} from '@app/utils/classnames'
import {Event, listen} from '@tauri-apps/api/event'
import {PropsWithChildren, useEffect, useMemo} from 'react'
import {Descendant, Editor as EditorType} from 'slate'
import {Editable, Slate} from 'slate-react'
import {
  buildDecorateHook,
  buildEditorHook,
  buildEventHandlerHooks,
  buildRenderElementHook,
  buildRenderLeafHook,
  EditorMode,
} from './plugin-utils'
import {plugins as defaultPlugins} from './plugins'
import './styles/editor.scss'
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

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('format_mark', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      if (!isMark(event.payload)) return

      toggleFormat(_editor, event.payload)
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

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

      const [element, path] =
        EditorType.above(_editor, {
          at: _editor.selection,
          match: isFlowContent,
        }) || []

      if (!element || !path) throw new Error('whut')

      set(_editor, {at: path, element})
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('format_list', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      if (
        !_editor.selection ||
        !['ordered_list', 'unordered_list', 'group'].includes(event.payload)
      )
        return

      const set = setList(
        {
          ordered_list: ol,
          unordered_list: ul,
          group,
        }[event.payload]!,
      )

      const [, path] =
        EditorType.above(_editor, {
          at: _editor.selection,
          match: isFlowContent,
        }) || []

      if (!path) throw new Error('whut')

      set(_editor, {at: path})
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  if (mode == EditorMode.Draft) {
    return (
      <div className={`${classnames('editor', mode)} ${flow()}`} id="editor">
        <Slate
          editor={_editor}
          value={value as Array<Descendant>}
          onChange={onChange}
        >
          <EditorHoveringToolbar />
          <Editable
            autoCorrect="false"
            autoCapitalize="false"
            spellCheck="false"
            data-testid="editor"
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            decorate={decorate}
            placeholder="Start typing here..."
            {...eventHandlers}
          />
          {children}
        </Slate>
      </div>
    )
  }

  return (
    <span
      className={`${classnames('editor', mode)} ${flow()}`}
      id="editor"
      // onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
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
          readOnly
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={decorate}
          {...eventHandlers}
        />
      </Slate>
    </span>
  )
}
