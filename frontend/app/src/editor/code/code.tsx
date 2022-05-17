import {BlockWrapper} from '@app/editor/block-wrapper'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {css, styled} from '@app/stitches.config'
import {Box} from '@components/box'
import type {Code as CodeType} from '@mintter/mttast'
import {
  createId,
  isCode,
  isParagraph,
  paragraph,
  statement,
  text,
} from '@mintter/mttast'
import {
  getHighlighter,
  Highlighter,
  IThemeRegistration,
  Lang,
  setCDN,
} from 'shiki'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useSlateStatic} from 'slate-react'
import {MARK_EMPHASIS} from '../emphasis'
import {EditorMode} from '../plugin-utils'
import {statementStyle} from '../statement'
import {MARK_STRONG} from '../strong'
import type {EditorPlugin} from '../types'
import {MARK_UNDERLINE} from '../underline'
import {findPath, resetFlowContent} from '../utils'

export const ELEMENT_CODE = 'code'
const HIGHLIGHTER = Symbol('shiki highlighter')

const SelectorWrapper = styled('div', {
  boxSizing: 'border-box',
  position: 'absolute',
  right: 0,
  top: 0,
  transform: 'translate(8px, -8px)',
  zIndex: 2,
  opacity: 0,
  transition: 'opacity 0.5s',
})

export const codeStyle = css(statementStyle, {
  position: 'relative',
  borderRadius: '$2',
  '&:hover': {
    [`${SelectorWrapper}`]: {
      opacity: 1,
    },
  },
})

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = (props: CodePluginProps = {}): EditorPlugin => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')

  return {
    name: ELEMENT_CODE,
    configureEditor(editor) {
      if (editor.readOnly) return
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
    onKeyDown: (editor) => {
      if (editor.readOnly) return
      return (ev) => {
        if (ev.key == 'Enter') {
          const code = Editor.above(editor, {match: isCode})
          if (code) {
            ev.preventDefault()
            if (ev.shiftKey) {
              const [, codePath] = code
              Editor.withoutNormalizing(editor, () => {
                let newBlock = statement({id: createId()}, [
                  paragraph([text('')]),
                ])
                Transforms.insertNodes(editor, newBlock, {
                  at: Path.next(codePath),
                })
                Transforms.select(editor, Path.next(codePath))
                Transforms.collapse(editor, {edge: 'start'})
                changesService.addChange(['moveBlock', newBlock.id])
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
          getHighlighter({theme, langs: [node.lang]}).then((highlighter) => {
            Transforms.setNodes(
              editor,
              {data: {...node.data, [HIGHLIGHTER]: highlighter}},
              {at: path},
            )
          })
        }

        // tokenize & decorate the paragraph inside codeblock
        if (isParagraph(node)) {
          const [code] =
            Editor.above(editor, {
              at: path,
              match: isCode,
            }) || []

          if (!code || !code.data?.[HIGHLIGHTER]) return []

          for (const [text, textPath] of Node.texts(node)) {
            const tokens = (code.data?.[HIGHLIGHTER] as Highlighter)
              .codeToThemedTokens(text.value, code.lang)
              .flatMap((l) => l)

            let offset = 0

            for (const token of tokens) {
              const range: Range & Record<string, unknown> = {
                anchor: {path: [...path, ...textPath], offset},
                focus: {
                  path: [...path, ...textPath],
                  offset: offset + token.content.length,
                },
                color: token.color,
              }

              if (token.fontStyle == 1) range[MARK_EMPHASIS] = true
              if (token.fontStyle == 2) range[MARK_STRONG] = true
              if (token.fontStyle == 4) range[MARK_UNDERLINE] = true

              ranges.push(range)
              offset += token.content.length
            }
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
  const editor = useSlateStatic()
  const path = findPath(element)

  function setLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    const {...newData} = element.data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(
      editor,
      {lang: e.target.value as Lang, data: newData},
      {at: path},
    )
  }

  let lang = element.lang || ''

  let blockProps = {
    'data-element-type': element.type,
    'data-element-id': (element as CodeType).id,
    ...attributes,
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <Box className={codeStyle()} {...blockProps}>
        {children}
      </Box>
    )
  }

  return (
    <BlockWrapper element={element} attributes={attributes} mode={mode}>
      <Box className={codeStyle()} {...blockProps}>
        {mode == EditorMode.Draft ? (
          <SelectorWrapper
            contentEditable={false}
            css={{
              position: 'absolute',
              right: 0,
              top: 0,
              transform: 'translate(8px, -8px)',
              zIndex: 2,
            }}
          >
            <select
              id="lang-selection"
              name="lang-selection"
              value={lang}
              onChange={setLanguage}
            >
              <option value="">Select a Language</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Golang</option>
            </select>
          </SelectorWrapper>
        ) : null}
        {children}
      </Box>
    </BlockWrapper>
  )
}
