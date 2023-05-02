import {useBlockProps} from '@app/editor/editor-node-props'
import {
  Code as CodeType,
  createId,
  isCode,
  isParagraph,
  statement,
  text,
  paragraph,
} from '@mintter/shared'

import {getHighlighter, Highlighter, setCDN} from 'shiki'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {ElementDrag} from '../drag-section'
import {MARK_EMPHASIS} from '../emphasis'
import {EditorMode} from '../plugin-utils'
import {MARK_STRONG} from '../strong'
import type {EditorPlugin} from '../types'
import {MARK_UNDERLINE} from '../underline'
import {lowerPoint, resetFlowContent} from '../utils'

export const HIGHLIGHTER = Symbol('shiki highlighter')

export const ELEMENT_CODE = 'code'
const LEAF_TOKEN = 'codeToken'

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
          const p = Editor.above(editor, {match: isParagraph})
          const code = Editor.above(editor, {match: isCode})

          if (p && code) {
            let parent = Path.parent(p[1])
            if (!Path.equals(parent, code[1])) return
            ev.preventDefault()
            if (ev.shiftKey) {
              const [, codePath] = code
              Editor.withoutNormalizing(editor, () => {
                let newPath = Path.next(codePath)
                Transforms.insertNodes(
                  editor,
                  statement(
                    {
                      id: createId(),
                    },
                    [paragraph([text('')])],
                  ),
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
  let {blockProps} = useBlockProps(element)

  if (mode == EditorMode.Embed) {
    // return (
    //   <SizableText size="$5" {...attributes} {...blockProps}>
    //     {children}
    //   </SizableText>
    // )
    return children
  }

  return (
    <ElementDrag element={element} attributes={attributes}>
      {children}
    </ElementDrag>
  )
}
