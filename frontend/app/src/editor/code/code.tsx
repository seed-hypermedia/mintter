import {useBlockProps} from '@app/editor/editor-node-props'
import {
  Code as CodeType,
  createId,
  isCode,
  isParagraph,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {useCurrentTheme} from '@app/theme'
import {useEffect} from 'react'
import {
  BUNDLED_LANGUAGES,
  getHighlighter,
  Highlighter,
  Lang,
  setCDN,
} from 'shiki'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import {RenderElementProps, useSlateStatic} from 'slate-react'
import {MARK_EMPHASIS} from '../emphasis'
import {EditorMode} from '../plugin-utils'
import {MARK_STRONG} from '../strong'
import type {EditorPlugin} from '../types'
import {MARK_UNDERLINE} from '../underline'
import {findPath, lowerPoint, resetFlowContent, useBlockFlash} from '../utils'
import {useBlockConversations} from '@app/editor/comments/conversations-context'
import {ConversationBlockBubble} from '@components/conversation-block-bubble'
import {BlockTools} from '@app/editor/blocktools'
import { ElementDrag } from '../drag-section'

export const ELEMENT_CODE = 'code'
const LEAF_TOKEN = 'codeToken'
const HIGHLIGHTER = Symbol('shiki highlighter')
// TODO make this user configurable in the future
const THEMES = {
  light: 'github-light',
  dark: 'github-dark',
}

export const createCodePlugin = (): EditorPlugin => {
  setCDN('/shiki/')

  return {
    name: ELEMENT_CODE,
    configureEditor(editor) {
      /*
       * @todo modify paste so it will add empty lines
       * @body we need to paste code content inside the same paragraph
       */
      const {deleteBackward} = editor
      editor.deleteBackward = (unit) => {
        if (resetFlowContent(editor)) return
        deleteBackward(unit)
      }

      return editor
    },
    renderElement:
      (editor) =>
      ({children, element, attributes}) => {
        if (isCode(element)) {
          return (
            <Code mode={editor.mode} element={element} attributes={attributes}>
              {children}
            </Code>
          )
        }
      },
    // This implementation is the same as the color plugin
    // but we chose a different mark name, to prevent syntax highlighting results from being persistet
    renderLeaf:
      () =>
      ({attributes, children, leaf}) => {
        if (leaf[LEAF_TOKEN] && leaf.text) {
          return (
            <span style={{color: leaf[LEAF_TOKEN]}} {...attributes}>
              {children}
            </span>
          )
        }
      },
    onKeyDown: (editor) => {
      return (ev) => {
        if (ev.key == 'Enter') {
          // TODO horacio: cancel this when inside block that is a child of a code block
          const code = Editor.above(editor, {match: isCode})
          if (code) {
            ev.preventDefault()
            if (ev.shiftKey) {
              const [, codePath] = code
              Editor.withoutNormalizing(editor, () => {
                let newPath = Path.next(codePath)
                Transforms.insertNodes(
                  editor,
                  statement({id: createId()}, [paragraph([text('')])]),
                  {
                    at: newPath,
                  },
                )
                Transforms.select(editor, newPath)
                Transforms.collapse(editor, {edge: 'start'})
              })
            } else {
              Transforms.insertText(editor, '\n')
            }
          }
        }
      }
    },
    decorate:
      (editor) =>
      ([node, path]) => {
        const ranges: Array<Range> = []

        // if the codeblock has a lang attribute but no highlighter yet, attach one
        if (isCode(node) && !node.data?.[HIGHLIGHTER] && node.lang) {
          getHighlighter({
            themes: Object.values(THEMES),
            langs: [node.lang],
          })
            .then((highlighter) => {
              Transforms.setNodes(
                editor,
                {data: {...node.data, [HIGHLIGHTER]: highlighter}},
                {at: path},
              )
            })
            .catch((error) => {
              console.error('Decorate error', error)
            })
        }

        // tokenize & decorate the paragraph inside codeblock
        if (isParagraph(node)) {
          const [code] =
            Editor.above(editor, {
              at: path,
              match: isCode,
            }) || []

          if (!code || !code.data?.[HIGHLIGHTER] || !code.data?.theme) return []

          const string = Node.string(node)

          const lines = (
            code.data?.[HIGHLIGHTER] as Highlighter
          ).codeToThemedTokens(string, code.lang, code.data.theme as string, {
            includeExplanation: false,
          })

          let offset = 0
          for (const line of lines) {
            for (const token of line) {
              const anchor = lowerPoint(node, {path, offset})
              const focus = lowerPoint(node, {
                path,
                offset: offset + token.content.length,
              })

              if (!anchor || !focus) {
                throw new Error('failed to lower point')
              }

              const range: Range & Record<string, unknown> = {
                anchor,
                focus,
                [LEAF_TOKEN]: token.color,
              }

              if (token.fontStyle == 1) range[MARK_EMPHASIS] = true
              if (token.fontStyle == 2) range[MARK_STRONG] = true
              if (token.fontStyle == 4) range[MARK_UNDERLINE] = true

              ranges.push(range)

              offset += token.content.length
            }

            // account for the newline delimiter
            offset += 1
          }
        }

        return ranges
      },
  }
}

function Code({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {
  element: CodeType
  mode: EditorMode
}) {
  let editor = useSlateStatic()
  let path = findPath(element)
  let {blockProps} = useBlockProps(element)
  let lang = (element as CodeType).lang || ''

  let inRoute = useBlockFlash(attributes.ref, element.id)

  function setLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    const {...newData} = (element as CodeType).data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(
      editor,
      {lang: e.target.value as Lang, data: newData},
      {at: path},
    )
  }

  const theme = useCurrentTheme()

  useEffect(() => {
    // TODO make this user configurable in the future
    const codeTheme = THEMES[theme]

    const {...newData} = (element as CodeType).data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(
      editor,
      {data: {...newData, theme: codeTheme}},
      {at: path},
    )
  }, [theme, editor])

  if (mode == EditorMode.Embed) {
    return (
      <span {...attributes} {...blockProps}>
        {children}
      </span>
    )
  }

  return (
    <ElementDrag
      element={element}
      attributes={attributes}
      mode={mode}
    >
      {children}
      {/* <BlockTools block={element as CodeType} /> */}
      {mode == EditorMode.Draft ? (
        <div className="code-selector-wrapper" contentEditable={false}>
          <select
            id="lang-selection"
            name="lang-selection"
            value={lang}
            onChange={setLanguage}
          >
            <option value="">Select a Language</option>
            {BUNDLED_LANGUAGES.map((lang) => (
              <option value={lang.id} key={lang.id}>
                {lang.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <span contentEditable={false}>
        <ConversationBlockBubble block={element as CodeType} />
      </span>
    </ElementDrag>
  )
}
