import {useDrag} from '@app/drag-context'
import {
  EditorHoveringToolbar,
  PublicationToolbar,
} from '@app/editor/hovering-toolbar'
import {flow} from '@app/stitches.config'
import {classnames} from '@app/utils/classnames'
import {error} from '@app/utils/logger'
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
} from '@mintter/shared'
import {Event, listen} from '@tauri-apps/api/event'
import debounce from 'lodash.debounce'
import {PropsWithChildren, useEffect, useMemo, useState} from 'react'
import {Descendant, Editor as EditorType, Transforms} from 'slate'
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
  let contextValues: DragContextValues = {
    drag: draggedNode,
    setDrag: debounce(
      (e: DragEvent, node: FlowContent) => {
        if (draggedNode) return
        setDraggedNode(node)
        e.preventDefault()
        const path = ReactEditor.findPath(editor, node)

        const domNode = ReactEditor.toDOMNode(editor, node)

        dragService?.send({
          type: 'DRAG.OVER',
          toPath: path,
          element: domNode as HTMLLIElement,
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

  const [mouseDown, setMouseDown] = useState(false)

  useEffect(() => {
    function handleMouseDown() {
      setMouseDown(true)
    }

    function handleMouseUp() {
      setMouseDown(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // async function createDummyComment(event: any) {
  //   event.preventDefault()
  //   // revision: bafy2bzacea243a2yqianaubbxtcy2zf7onupotwarh5jlmbsbs2dhb6q3km4m
  //   let selector: Selector = {
  //     blockId: 'fOShPYr6',
  //     blockRevision:
  //       'bafy2bzacea243a2yqianaubbxtcy2zf7onupotwarh5jlmbsbs2dhb6q3km4m',
  //     start: 0,
  //     end: 8,
  //   }

  //   let request = CreateConversationRequest.fromPartial({
  //     documentId:
  //       'bafy2bzacebcf32766lmlgrj7in6cbvjskk3prv6amyrtqmtgxw3ric22f4ghk',
  //     selectors: [selector],
  //     initialComment: {
  //       id: 'foobar',
  //       type: 'comment',
  //       text: "Hello I'm a comment",
  //     },
  //   })

  //   let res = await new CommentsClientImpl(client).createConversation(request)
  //   console.log('🚀 ~ file: editor.tsx:102 ~ createDummyComment ~ res', res)
  // }

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

  useEffect(() => {
    contextValues.drag = draggedNode
  }, [draggedNode])

  if (mode == EditorMode.Draft) {
    return (
      <div className={`${classnames('editor', mode)} ${flow()}`} id="editor">
        <DragContext.Provider value={contextValues}>
          <Slate
            editor={editor}
            value={value as Array<Descendant>}
            onChange={onChange}
          >
            <EditorHoveringToolbar mouseDown={mouseDown} />
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
        {/* <pre>{JSON.stringify(editor.children, null, 2)}</pre> */}
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
        {mode == EditorMode.Publication ? (
          <>
            <PublicationToolbar />
            {/* <button onClick={createDummyComment}>add dummy comment</button> */}
          </>
        ) : null}
        <Editable
          id="editor"
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
      {/* <pre>{JSON.stringify(value, null, 2)}</pre> */}
    </span>
  )
}
