import {
  useEditorDraft,
  usePublication,
  useSaveDraft,
} from '@app/models/documents'
import {useCallback, useMemo} from 'react'
import {createEditor, Editor as SlateEditor} from 'slate'
import {ImageElement, withImages} from './image/image'
import './styles/editor.css'

import {
  Editable,
  RenderElementProps,
  RenderLeafProps,
  Slate,
  withReact,
} from 'slate-react'
import {Block, deleteBackwardKeydown, withBlocks} from './block'
import {ELEMENT_BLOCKQUOTE} from './blockquote'
import {ELEMENT_CODE, LEAF_TOKEN} from './code'
import {ELEMENT_EMBED, EmbedElement, embedKeyDown, withEmbed} from './embed'
import {ELEMENT_FILE, FileElement} from './file/file'
import {
  ELEMENT_GROUP,
  ELEMENT_ORDERED_LIST,
  ELEMENT_UNORDERED_LIST,
  Group,
} from './group'
import {ELEMENT_HEADING} from './heading'
import {ELEMENT_IMAGE} from './image/image'
import {ELEMENT_LINK, LinkElement, linkKeyDown, withLinks} from './link'
import {withHyperdocs} from './mintter-changes/plugin'
import {EditorMode, withMode} from './plugin-utils'
import {ELEMENT_STATEMENT} from './statement'
import {
  ELEMENT_STATIC_PARAGRAPH,
  StaticParagraphElement,
} from './static-paragraph'
import {ELEMENT_VIDEO, VideoElement} from './video/video'
import {withPasteHtml} from './paste-plugin'
import {ELEMENT_PARAGRAPH, ParagraphElement} from './paragraph'
import {withHistory} from 'slate-history'
import {withDirtyPaths} from './dirty-paths'
import {SizableText} from '@mintter/ui'
import {ConversationsLeaf} from './comments/comments'
import {withMarkdownShortcuts} from './markdown-plugin'
import isHotkey from 'is-hotkey'
import {
  blockNodeToSlate,
  group,
  paragraph,
  statement,
  text,
} from '@mintter/shared'

export const plugins = []

export type EditorProps = {
  editor: SlateEditor
  onChange: any
  value: any
  mode: EditorMode
  toolbar?: React.ReactNode
}

export function Editor({editor, value, onChange, mode, toolbar}: EditorProps) {
  const renderElement = useCallback(RenderElement(mode), [])
  const renderLeaf = useCallback(RenderLeaf(mode), [])

  return (
    <div
      className={`editor ${mode}`}
      onKeyDown={function rootOnKeyDown(event) {
        formatKeydown(editor, event)
        if (selectAllKeyDown(editor, event)) return
        if (tabKeyDown(editor, event)) return
        if (embedKeyDown(editor, event)) return
        if (linkKeyDown(editor, event)) return
        // if (deleteBackwardKeydown(editor, event)) return
      }}
      onCompositionEnd={(e) => {
        // this plugin prevents to add extra characters when "composing"
        // when we add accents we are composing
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <Slate editor={editor} value={value} onChange={onChange}>
        {toolbar}
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Start writing..."
          readOnly={mode != EditorMode.Draft}
          onChange={(...val) => {
            console.log('val', val)
          }}
        />
      </Slate>
    </div>
  )
}

function RenderElement(mode: EditorMode) {
  return function ReturnedRenderElement(props: RenderElementProps) {
    switch (props.element.type) {
      case ELEMENT_GROUP:
      case ELEMENT_UNORDERED_LIST:
      case ELEMENT_ORDERED_LIST:
        return <Group {...props} mode={mode} />

      case ELEMENT_STATEMENT:
      case ELEMENT_BLOCKQUOTE:
      case ELEMENT_CODE:
      case ELEMENT_HEADING:
        return <Block {...props} mode={mode} />

      case ELEMENT_PARAGRAPH:
        return <ParagraphElement {...props} mode={mode} />

      case ELEMENT_STATIC_PARAGRAPH:
        return <StaticParagraphElement {...props} />

      case ELEMENT_EMBED:
        return <EmbedElement {...props} mode={mode} />

      case ELEMENT_LINK:
        return <LinkElement {...props} mode={mode} />
      // return props.children

      case ELEMENT_IMAGE:
        return <ImageElement {...props} />

      case ELEMENT_VIDEO:
        return <VideoElement {...props} />

      case ELEMENT_FILE:
        return <FileElement {...props} />

      default:
        return <p {...props.attributes}>{props.children}</p>
    }
  }
}

function RenderLeaf(mode: EditorMode) {
  return function ReturnedRenderLeaf(props: RenderLeafProps) {
    if (
      typeof props.leaf.conversations !== 'undefined' &&
      props.leaf.conversations?.length
    ) {
      return <ConversationsLeaf {...props} />
    }

    const {leaf, children, attributes} = props

    return (
      <SizableText
        {...attributes}
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
          leaf[LEAF_TOKEN]
            ? leaf[LEAF_TOKEN]
            : leaf.color
            ? leaf.color
            : '$color'
        }
        verticalAlign={
          leaf.subscript ? 'bottom' : leaf.superscript ? 'top' : undefined
        }
        paddingHorizontal={leaf.code ? '$2' : undefined}
        paddingVertical={leaf.code ? '$1' : undefined}
        backgroundColor={leaf.code ? '$backgroundHover' : undefined}
        fontSize={leaf.code ? '$3' : 'inherit'}
      >
        {children}
      </SizableText>
    )
  }
}

export function useDraftEditor({
  documentId,
  initWebUrl,
}: {
  documentId: string
  initWebUrl?: string
}) {
  let editor = useMemo(
    () =>
      withMode(EditorMode.Draft)(
        withEmbed(
          withMarkdownShortcuts(
            withDirtyPaths(
              withImages(
                withPasteHtml(
                  withLinks(
                    withBlocks(
                      withHyperdocs(withHistory(withReact(createEditor()))),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    [],
  )
  let saveDraft = useSaveDraft(editor, documentId)

  const state = useEditorDraft({
    editor,
    documentId,
    initWebUrl,
  })

  return {
    state,
    editor,
    saveDraft,
  }
}

let emptyEditor = group({data: {parent: ''}}, [
  statement({id: ''}, [paragraph([text('')])]),
])

export function usePublicationEditor(documentId: string, versionId?: string) {
  let editor = useMemo(
    () =>
      withMode(EditorMode.Publication)(
        withEmbed(
          withMarkdownShortcuts(
            withDirtyPaths(
              withImages(
                withPasteHtml(
                  withLinks(
                    withBlocks(
                      withHyperdocs(withHistory(withReact(createEditor()))),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    [],
  )

  const editorKey = `${documentId}.${versionId}`

  const state = usePublication({
    documentId,
    versionId,
  })

  let value = useMemo(() => {
    const children = state.data?.document?.children
    if (children?.length) {
      return [blockNodeToSlate(children, 'group')]
    }
    return [emptyEditor]
  }, [editorKey, state.data])

  return {
    editor,
    state,
    value,
    editorKey,
  }
}

function selectAllKeyDown(
  editor: SlateEditor,
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.defaultPrevented) return false
  if (event.metaKey && event.key == 'a') {
    event.preventDefault()
    editor.select([])
    return true
  }
  return false
}

function tabKeyDown(
  editor: SlateEditor,
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.defaultPrevented) return false
  if (event.key == 'Tab') {
    event.preventDefault()
    return true
  }
  return false
}

const HOTKEYS = {
  'mod+b': 'strong',
  'mod+i': 'emphasis',
  'mod+u': 'underline',
  'mod+`': 'code',
}

function formatKeydown(
  editor: SlateEditor,
  event: React.KeyboardEvent<HTMLElement>,
) {
  if (event.defaultPrevented) return false
  for (const hotkey in HOTKEYS) {
    if (isHotkey(hotkey, event as any)) {
      event.preventDefault()
      // @ts-ignore HOTKEYS[hotkey]
      const mark = HOTKEYS[hotkey]
      toggleMark(editor, mark)
      return true
    }
  }
  return false
}

function toggleMark(editor: SlateEditor, format: any) {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    editor.removeMark(format)
  } else {
    editor.addMark(format, true)
  }
}

const isMarkActive = (editor: SlateEditor, format: any) => {
  const marks = SlateEditor.marks(editor)
  // @ts-ignore marks[format]
  return marks ? marks[format] === true : false
}
