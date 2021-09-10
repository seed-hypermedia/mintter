import type {Range} from 'slate'
import type {Lang} from 'shiki'
import type {RenderElementProps} from 'slate-react'
import type {Code as CodeType, FlowContent} from '@mintter/mttast'
import type {Highlighter, IThemeRegistration} from 'shiki'
import type {EditorPlugin} from '../types'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {resetFlowContent} from '../utils'
import {setCDN, getHighlighter} from 'shiki'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {isCode, isParagraph} from '@mintter/mttast'
import {Editor, Node, Transforms} from 'slate'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_UNDERLINE} from '../leafs/underline'
import {StatementTools} from '../statement-tools'
import {statementStyle} from './statement'

export const ELEMENT_CODE = 'code'
const HIGHLIGHTER = Symbol('shiki highlighter')

export const CodeStyled = styled('pre', statementStyle)

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = async (props: CodePluginProps = {}): Promise<EditorPlugin> => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')

  let editor: Editor

  return {
    name: ELEMENT_CODE,
    configureEditor(e) {
      editor = e

      const {deleteBackward} = e
      e.deleteBackward = (unit) => {
        if (resetFlowContent(editor)) return
        deleteBackward(unit)
      }

      return e
    },
    renderElement({children, element, attributes}) {
      if (isCode(element)) {
        return (
          <Code element={element} attributes={attributes}>
            {children}
          </Code>
        )
      }
    },
    onKeyDown(ev) {
      if (ev.key === 'Enter') {
        const code = Editor.above(editor, {match: isCode})
        if (code) {
          ev.preventDefault()
          Transforms.insertText(editor, '\n')
        }
      }
    },
    decorate([node, path]) {
      const ranges: Array<Range> = []

      // if the codeblock has a lang attribute but no highlighter yet, attach one
      if (isCode(node) && !node.data?.[HIGHLIGHTER] && node.lang) {
        getHighlighter({theme, langs: [node.lang]}).then((highlighter) => {
          Transforms.setNodes(editor, {data: {...node.data, [HIGHLIGHTER]: highlighter}}, {at: path})
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
              focus: {path: [...path, ...textPath], offset: offset + token.content.length},
              color: token.color,
            }

            if (token.fontStyle === 1) range[MARK_EMPHASIS] = true
            if (token.fontStyle === 2) range[MARK_STRONG] = true
            if (token.fontStyle === 4) range[MARK_UNDERLINE] = true

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
}: RenderElementProps & {
  element: CodeType
}) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)

  function setLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    const {...newData} = element.data
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(editor, {lang: e.target.value as Lang, data: newData}, {at: path})
  }

  let lang = element.lang || ''

  return (
    <>
      <Box
        contentEditable={false}
        css={{
          position: 'absolute',
          right: 0,
          top: 0,
          transform: 'translate(8px, -8px)',
          zIndex: 2,
        }}
      >
        <select id="lang-selection" name="lang-selection" value={lang} onChange={setLanguage}>
          <option value="">Select a Language</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="go">Golang</option>
        </select>
      </Box>
      <CodeStyled data-element-type={element.type} {...attributes}>
        <StatementTools element={element} />
        <Box
          as="code"
          css={{
            backgroundColor: '$background-muted',
            padding: '$7',
            borderRadius: '$2',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </Box>
      </CodeStyled>
    </>
  )
}
