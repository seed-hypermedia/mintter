import {useDrag} from '@app/drag-context'
import {
  createBlockquotePlugin,
  ELEMENT_BLOCKQUOTE,
} from '@app/editor/blockquote'
import {createCodePlugin, ELEMENT_CODE, LEAF_TOKEN} from '@app/editor/code'
import {createColorPlugin} from '@app/editor/color'
import {ConversationsLeaf} from '@app/editor/comments/comments'
import {createDirtyPathPlugin} from '@app/editor/dirty-paths'
import {createEmbedPlugin, ELEMENT_EMBED, EmbedElement} from '@app/editor/embed'
import {createEmphasisPlugin} from '@app/editor/emphasis'
import {
  createGroupPlugin,
  ELEMENT_GROUP,
  ELEMENT_ORDERED_LIST,
  ELEMENT_UNORDERED_LIST,
  Group,
} from '@app/editor/group'
import {createHeadingPlugin, ELEMENT_HEADING} from '@app/editor/heading'
import {
  EditorHoveringToolbar,
  PublicationToolbar,
} from '@app/editor/hovering-toolbar'
import {
  createImagePlugin,
  ELEMENT_IMAGE,
  ImageElement,
} from '@app/editor/image/image'
import {createInlineCodePlugin} from '@app/editor/inline-code'
import {createLinkPlugin, ELEMENT_LINK, LinkElement} from '@app/editor/link'
import {createMarkdownShortcutsPlugin} from '@app/editor/markdown-plugin'
import {createMintterChangesPlugin} from '@app/editor/mintter-changes/plugin'
import {createParagraphPlugin, ParagraphElement} from '@app/editor/paragraph'
import {createPlainTextPastePlugin} from '@app/editor/paste-plugin'
import {createStatementPlugin, ELEMENT_STATEMENT} from '@app/editor/statement'
import {BlockElement} from '@app/editor/statement/block'
import {
  createStaticParagraphPlugin,
  ELEMENT_STATIC_PARAGRAPH,
  StaticParagraphElement,
} from '@app/editor/static-paragraph'
import {createStrongPlugin} from '@app/editor/strong'
import {createTabPlugin} from '@app/editor/tab-plugin'
import {createUnderlinePlugin} from '@app/editor/underline'
import {
  createVideoPlugin,
  ELEMENT_VIDEO,
  VideoElement,
} from '@app/editor/video/video'
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
  Paragraph,
  statement,
  ul,
} from '@mintter/shared'
import {SizableText} from '@mintter/ui'
import debounce from 'lodash.debounce'
import {
  ElementType,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {Descendant, Editor as SlateEditor, NodeEntry, Transforms} from 'slate'
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  RenderLeafProps,
  Slate,
} from 'slate-react'
import DragContext, {DragContextValues, HoveredNode} from './drag-context'
import {buildEventHandlerHooks, EditorMode} from './plugin-utils'
import './styles/editor.css'
import type {EditorPlugin} from './types'
import {findPath, setList, setType, toggleFormat} from './utils'

interface EditorProps {
  children?: ReactNode
  mode?: EditorMode
  value: ChildrenOf<any> | Array<FlowContent>
  onChange?: (value: Descendant[]) => void
  editor?: SlateEditor
  plugins?: Array<EditorPlugin>
  as?: ElementType
  className?: string
  readOnly?: boolean
}

const _plugins: EditorPlugin[] = [
  createMintterChangesPlugin(),
  createDirtyPathPlugin(),
  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createColorPlugin(),
  createInlineCodePlugin(),
  createLinkPlugin(),
  createEmbedPlugin(),
  createVideoPlugin(),
  createImagePlugin(),
  createStaticParagraphPlugin(),
  createParagraphPlugin(),
  createHeadingPlugin(),
  createStatementPlugin(),
  createBlockquotePlugin(),
  createCodePlugin(),
  createGroupPlugin(),
  createTabPlugin(),
  createMarkdownShortcutsPlugin(),
  createPlainTextPastePlugin(),
  // createCommentsPlugin(),
  // createFindPlugin(),
  // extensionsPlugin(['./ext_twitter.wasm', './ext_youtube.wasm']),
  {
    name: 'selectAllPlugin',
    onKeyDown: (editor) => (event) => {
      if (event.metaKey && event.key == 'a') {
        event.preventDefault()
        Transforms.select(editor, [])
        return
      }
    },
  },
  {
    name: 'prevent double accent letters',
    onCompositionEnd: () => (e) => {
      // this plugin prevents to add extra characters when "composing"
      // when we add accents we are composing
      e.preventDefault()
      e.stopPropagation()
    },
  },

  {
    name: 'prevent selection after drag and drop',
    configureEditor: (editor) => {
      const {apply} = editor
      editor.apply = (operation) => {
        if (operation.type == 'set_selection') {
          //@ts-ignore
          if (editor.dragging) {
            ReactEditor.deselect(editor)
          } else {
            apply(operation)
          }
        } else {
          apply(operation)
        }
      }
      return editor
    },
  },
]

export const plugins = _plugins

export function Editor({
  value,
  onChange,
  children,
  mode = EditorMode.Draft,
  editor,
  plugins = _plugins,
  as = 'div',
  readOnly = false,
}: PropsWithChildren<EditorProps>) {
  if (!editor) {
    throw Error(`<Editor /> ERROR: "editor" prop is required. Got ${editor}`)
  }

  // let decorate = useDecorate(plugins, editor)

  const renderElement = useCallback(
    mode == EditorMode.Embed ? RenderEmbed : RenderElement,
    [],
  )
  const renderLeaf = useCallback(RenderLeaf, [])

  const eventHandlers = useMemo(
    () => buildEventHandlerHooks(plugins, editor),
    [],
  )

  if (mode == EditorMode.Draft) {
    return (
      <div className={`${classnames('editor', mode)} ${flow()}`} id="editor">
        <LocalDragProvider>
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
              // decorate={decorate}
              placeholder="Start typing here..."
              {...eventHandlers}
            />
            {children}
          </Slate>
        </LocalDragProvider>
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
          // decorate={decorate}
          readOnly={readOnly}
          {...eventHandlers}
        />
      </Slate>
    </span>
  )
}

// function useDecorate(plugins: EditorPlugin[], editor: EditorType) {
//   let decoration = useMemo(() => buildDecorateHook(plugins, editor), [])
//   return useCallback(
//     (props: NodeEntry) => (decoration ? decoration(props) : null),
//     [editor.nodeToDecorations],
//   )
// }

export function useTauriListeners(editor: SlateEditor) {
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
        editor.above({
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
        editor.above({
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

function RenderEmbed(props: RenderElementProps) {
  return (
    <ParagraphElement
      mode={EditorMode.Embed}
      attributes={props.attributes}
      element={props.element as Paragraph}
    >
      {props.children}
    </ParagraphElement>
  )
}

function RenderElement(props: RenderElementProps) {
  switch (props.element.type) {
    case ELEMENT_GROUP:
    case ELEMENT_UNORDERED_LIST:
    case ELEMENT_ORDERED_LIST:
      return <Group {...props} />

    case ELEMENT_STATEMENT:
    case ELEMENT_BLOCKQUOTE:
    case ELEMENT_CODE:
    case ELEMENT_HEADING:
      return <BlockElement {...props} />

    case ELEMENT_STATIC_PARAGRAPH:
      return <StaticParagraphElement {...props} />

    case ELEMENT_EMBED:
      return <EmbedElement {...props} />

    case ELEMENT_LINK:
      return <LinkElement {...props} />

    case ELEMENT_IMAGE:
      return <ImageElement {...props} />

    case ELEMENT_VIDEO:
      return <VideoElement {...props} />

    default:
      return <ParagraphElement {...props} />
  }
}

function RenderLeaf(props: RenderLeafProps) {
  if (
    typeof props.leaf.conversations !== 'undefined' &&
    props.leaf.conversations?.length
  ) {
    return <ConversationsLeaf {...props} />
  }

  const {leaf, children, attributes} = props

  return (
    <SizableText
      tag={leaf.code ? 'code' : undefined}
      fontWeight={leaf.strong ? '800' : 'inherit'}
      fontStyle={leaf.emphasis ? 'italic' : 'normal'}
      textDecorationLine={
        leaf.underline
          ? 'underline'
          : leaf.strikethrough
          ? 'line-through'
          : 'none'
      }
      color={
        leaf[LEAF_TOKEN] ? leaf[LEAF_TOKEN] : leaf.color ? leaf.color : '$color'
      }
      verticalAlign={
        leaf.subscript ? 'bottom' : leaf.superscript ? 'top' : undefined
      }
      paddingHorizontal={leaf.code ? '$2' : undefined}
      paddingVertical={leaf.code ? '$1' : undefined}
      backgroundColor={leaf.code ? '$backgroundHover' : undefined}
      fontSize={leaf.code ? '$3' : 'inherit'}
      {...attributes}
    >
      {children}
    </SizableText>
  )
}

function LocalDragProvider({children}: {children: ReactNode}) {
  const dragService = useDrag()
  const [draggedNode, setDraggedNode] = useState<HoveredNode>(null)

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

  return (
    <DragContext.Provider value={contextValues}>
      {children}
    </DragContext.Provider>
  )
}

export function useDragContext() {
  let context = useContext(DragContext)
  // TODO: make sure is available
  return context
}