import {BlockToolsTarget} from '@app/editor/block-tools-target'
import {useBlockProps} from '@app/editor/editor-node-props'
import {blockStyles} from '@app/editor/styles'
import {useFileEditor} from '@app/file-provider'
import {
  Code as CodeType,
  createId,
  isCode,
  isParagraph,
  paragraph,
  statement,
  text,
} from '@app/mttast'
import {styled} from '@app/stitches.config'
import {useCurrentTheme} from '@app/theme'
import {Box} from '@components/box'
import {useEffect} from 'react'
import {
  BUNDLED_LANGUAGES,
  getHighlighter,
  Highlighter,
  Lang,
  setCDN,
} from 'shiki'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {MARK_EMPHASIS} from '../emphasis'
import {EditorMode} from '../plugin-utils'
import {MARK_STRONG} from '../strong'
import type {EditorPlugin} from '../types'
import {MARK_UNDERLINE} from '../underline'
import {findPath, lowerPoint, resetFlowContent} from '../utils'

export const ELEMENT_CODE = 'code'
const LEAF_TOKEN = 'codeToken'
const HIGHLIGHTER = Symbol('shiki highlighter')
// TODO make this user configurable in the future
const THEMES = {
  light: 'github-light',
  dark: 'github-dark',
}

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

export const createCodePlugin = (): EditorPlugin => {
  // const {theme = 'github-dark'} = props
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
        if (leaf[LEAF_TOKEN] && leaf.value) {
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
          const code = Editor.above(editor, {match: isCode})
          if (code) {
            ev.preventDefault()
            if (ev.shiftKey) {
              const [, codePath] = code
              Editor.withoutNormalizing(editor, () => {
                Transforms.insertNodes(
                  editor,
                  statement({id: createId()}, [paragraph([text('')])]),
                  {
                    at: Path.next(codePath),
                  },
                )
                Transforms.select(editor, Path.next(codePath))
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
          }).then((highlighter) => {
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

          const string = Node.string(node)

          const lines = (
            code.data?.[HIGHLIGHTER] as Highlighter
          ).codeToThemedTokens(string, code.lang, code.data.theme, {
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
  let editor = useFileEditor()
  let path = findPath(element)
  let {blockProps, parentNode} = useBlockProps(element)
  let lang = (element as CodeType).lang || ''

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
    const codeTheme = THEMES[theme]
    const {...newData} = (element as CodeType).data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(
      editor,
      {data: {...newData, theme: codeTheme}},
      {at: path},
    )
  }, [theme, editor])

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <span {...attributes} {...blockProps}>
        {children}
      </span>
    )
  }

  return (
    <Box
      as="li"
      className={blockStyles({type: 'code', groupType: parentNode?.type})}
      {...attributes}
      {...blockProps}
    >
      {children}
      <BlockToolsTarget type="code" />
      {mode == EditorMode.Draft ? (
        <SelectorWrapper
          contentEditable={false}
          css={{
            position: 'absolute',
            left: '$sizes$prose-width',
            top: 0,
            transform: 'translate(-100px, -8px)',
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
            {BUNDLED_LANGUAGES.map((lang) => (
              <option value={lang.id} key={lang.id}>
                {lang.id}
              </option>
            ))}
          </select>
        </SelectorWrapper>
      ) : null}
    </Box>
  )
}
