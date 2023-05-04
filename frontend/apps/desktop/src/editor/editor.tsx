import {useDrag} from '@app/drag-context'
import {
  EditorHoveringToolbar,
  PublicationToolbar,
} from '@app/editor/hovering-toolbar'
import {useWindowListen} from '@app/ipc'
import {flow} from '@app/stitches.config'
import {classnames} from '@app/utils/classnames'
import {error} from '@app/utils/logger'
import {
  blockquote,
  ChildrenOf,
  code,
  FlowContent,
  group,
  heading,
  isFlowContent,
  isMark,
  ol,
  statement,
  ul,
} from '@mintter/shared'
import debounce from 'lodash.debounce'
import {
  ElementType,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {Descendant, Editor as EditorType, NodeEntry, Transforms} from 'slate'
import {Editable, ReactEditor, Slate} from 'slate-react'
import DragContext, {DragContextValues, HoveredNode} from './drag-context'
import {
  buildDecorateHook,
  buildEventHandlerHooks,
  buildRenderElementHook,
  buildRenderLeafHook,
  EditorMode,
} from './plugin-utils'
import {plugins as defaultPlugins} from './plugins'
import './styles/editor.css'
import type {EditorPlugin} from './types'
import {findPath, setList, setType, toggleFormat} from './utils'

interface EditorProps {
  children?: ReactNode
  mode?: EditorMode
  value: ChildrenOf<any> | Array<FlowContent>
  onChange?: (value: Descendant[]) => void
  editor?: EditorType
  plugins?: Array<EditorPlugin>
  as?: ElementType
  className?: string
  readOnly?: boolean
}

export function Editor({
  value,
  onChange,
  children,
  mode = EditorMode.Draft,
  editor,
  plugins = defaultPlugins,
  as = 'div',
  readOnly = false,
}: PropsWithChildren<EditorProps>) {
  if (!editor) {
    throw Error(`<Editor /> ERROR: "editor" prop is required. Got ${editor}`)
  }

  const dragService = useDrag()
  const [draggedNode, setDraggedNode] = useState<HoveredNode>(null)

  // useSelectAll(editor, mode)

  let contextValues: DragContextValues = useMemo(
    () => ({
      drag: draggedNode,
      setDrag: debounce(
        (e: DragEvent, node: FlowContent) => {
          if (draggedNode) return
          setDraggedNode(node)
          e.preventDefault()
          const path = findPath(node)

          dragService?.send({
            type: 'DRAG.OVER',
            toPath: path,
            element: [node, path] as NodeEntry<FlowContent>,
            currentPosX: e.clientX,
            currentPosY: e.clientY,
          })
        },
        100,
        {leading: true, trailing: false},
      ),
      clearDrag: () => {
        setDraggedNode(null)
      },
    }),
    [draggedNode],
  )

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

  if (mode == EditorMode.Draft) {
    return (
      <div className={`${classnames('editor', mode)} ${flow()}`} id="editor">
        <DragContext.Provider value={contextValues}>
          <Slate
            editor={editor}
            value={value as Array<Descendant>}
            onChange={onChange}
          >
            <EditorHoveringToolbar />
            <Editable
              id="editor"
              data-testid="editor"
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              decorate={decorate}
              placeholder="Start typing here..."
              {...eventHandlers}
            />
            {children}
          </Slate>
        </DragContext.Provider>
      </div>
    )
  }

  return (
    <span className={`${classnames('editor', mode)} ${flow()}`}>
      <Slate
        editor={editor}
        value={value as Array<Descendant>}
        onChange={onChange}
      >
        {mode == EditorMode.Publication ? <PublicationToolbar /> : null}
        <Editable
          id="editor"
          //@ts-ignore
          as={as}
          autoCorrect="false"
          autoCapitalize="false"
          spellCheck="false"
          data-testid="editor"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={decorate}
          readOnly={readOnly}
          {...eventHandlers}
        />
      </Slate>
    </span>
  )
}

function useSelectAll(editor: EditorType, mode: EditorMode) {
  const applySelectAll = (event: KeyboardEvent) => {
    if (editor && event.metaKey && event.key == 'a') {
      event.preventDefault()
      ReactEditor.focus(editor!)
      setTimeout(() => {
        Transforms.select(editor, [])
      }, 10)

      return
    }
  }

  useEffect(() => {
    if (editor && mode == EditorMode.Publication) {
      document.addEventListener('keydown', applySelectAll)
    }

    return () => {
      if (editor && mode == EditorMode.Publication) {
        document.removeEventListener('keydown', applySelectAll)
      }
    }
  }, [])
}

export function useTauriListeners(editor: EditorType) {
  useWindowListen<string>(
    'format_mark',
    (event) => {
      if (!isMark(event.payload)) return

      toggleFormat(editor, event.payload)
    },
    [],
  )

  useWindowListen<string>(
    'format_block',
    (event) => {
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
    },
    [],
  )

  useWindowListen<string>(
    'format_list',
    (event) => {
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

      const [element, path] =
        EditorType.above(editor, {
          at: editor.selection,
          match: isFlowContent,
        }) || []

      if (!element || !path) throw new Error('whut')

      if (path) {
        set(editor, {element, at: path})
      } else {
        error('whut')
      }
    },
    [],
  )
}
