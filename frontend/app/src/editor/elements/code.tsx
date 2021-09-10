import type {Highlighter, IThemeRegistration} from 'shiki'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'
import {setCDN, getHighlighter} from 'shiki'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {isCode, isParagraph} from '@mintter/mttast'
import {Editor, Node, Transforms} from 'slate'
import type {Range} from 'slate'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_UNDERLINE} from '../leafs/underline'
import {StatementTools} from '../statement-tools'
import {statementStyle} from './statement'

export const ELEMENT_CODE = 'code'

const HIGHLIGHTER = Symbol('shiki highlighter')

export const Code = styled('pre', statementStyle)

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
      const {deleteBackward} = e
      e.deleteBackward = (unit) => {
        if (resetFlowContent(editor)) return
        deleteBackward(unit)
      }
      editor = e

      return e
    },
    renderElement({attributes, children, element}) {
      if (isCode(element)) {
        return (
          <Code data-element-type={element.type} {...attributes}>
            <StatementTools element={element} />
            <Box
              as="code"
              css={{
                backgroundColor: '$background-muted',
                padding: '$7',
                borderRadius: '$2',
                overflow: 'scroll',
                position: 'relative',
                // color: highlighter.getForegroundColor(theme as string),
                // caretColor: highlighter.getForegroundColor(theme as string),
                // backgroundColor: highlighter.getBackgroundColor(theme as string),
              }}
            >
              {children}
            </Box>
          </Code>
        )
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
