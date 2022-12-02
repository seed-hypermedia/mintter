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
import {error} from '@app/utils/logger'
import {Event, listen} from '@tauri-apps/api/event'
import {PropsWithChildren, useEffect, useMemo} from 'react'
import {Descendant, Editor as EditorType, Transforms} from 'slate'
import {Editable, ReactEditor, Slate} from 'slate-react'
import {
  buildDecorateHook,
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
  if (!editor) {
    throw Error(`<Editor /> ERROR: "editor" prop is required. Got ${editor}`)
  }

  const renderElement = useMemo(
    () => buildRenderElementHook(plugins, editor),
    [plugins, editor],
  )
  const renderLeaf = useMemo(
    () => buildRenderLeafHook(plugins, editor),
    [plugins, editor],
  )
  const decorate = useMemo(
    () => buildDecorateHook(plugins, editor),
    [plugins, editor],
  )
  const eventHandlers = useMemo(
    () => buildEventHandlerHooks(plugins, editor),
    [plugins, editor],
  )

  useEffect(() => {
    if (editor && mode == EditorMode.Publication) {
      document.addEventListener('keydown', applySelectAll)
    }

    return () => {
      if (editor && mode == EditorMode.Publication) {
        document.removeEventListener('keydown', applySelectAll)
      }
    }

    function applySelectAll(event) {
      if (editor && event.metaKey && event.key == 'a') {
        event.preventDefault()
        ReactEditor.focus(editor!)
        setTimeout(() => {
          Transforms.select(editor, [])
        }, 10)

        return
      }
    }
  }, [])

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    listen('format_mark', (event: Event<string>) => {
      if (!isSubscribed) {
        return unlisten()
      }

      if (!isMark(event.payload)) return

      toggleFormat(editor, event.payload)
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
        unlisten()
      }

      if (!editor.selection) return

      const set = setType(
        {
          heading,
          statement,
          blockquote,
          codeblock: code,
        }[event.payload],
      )

      const [element, path] =
        EditorType.above(editor, {
          at: editor.selection,
          match: isFlowContent,
        }) || []

      if (!element || !path) throw new Error('whut')

      set(editor, {at: path, element})
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
        !editor.selection ||
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
        EditorType.above(editor, {
          at: editor.selection,
          match: isFlowContent,
        }) || []

      if (!path) error('whut')

      set(editor, {at: path})
    }).then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  if (mode == EditorMode.Draft) {
    return (
      <div className={`${classnames('editor', mode)} ${flow()}`} id="editor">
        <Slate
          editor={editor}
          value={value as Array<Descendant>}
          onChange={onChange}
        >
          <EditorHoveringToolbar />
          <Editable
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
      // onMouseLeave={() => hoverService.send('MOUSE_LEAVE')}
    >
      <Slate
        editor={editor}
        value={value as Array<Descendant>}
        onChange={onChange}
      >
        {/* {mode == EditorMode.Publication ? (
            <PublicationHoveringToolbar />
          ) : null} */}
        <Editable
          as={as}
          autoCorrect="false"
          autoCapitalize="false"
          spellCheck="false"
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
