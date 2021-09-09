import type {IThemeRegistration} from 'shiki'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'
import {setCDN, getHighlighter} from 'shiki'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {isCode, isText} from '@mintter/mttast'
import {Range, Editor} from 'slate'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_UNDERLINE} from '../leafs/underline'
import {StatementTools} from '../statement-tools'
import {statementStyle} from './statement'

export const ELEMENT_CODE = 'code'

export const Code = styled('pre', statementStyle)

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = async (props: CodePluginProps = {}): Promise<EditorPlugin> => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')
  /*
   * @todo `getHighlighter() await takes too long?`
   * @body can we do this after we render the editor? this function is taking long and is making the editor look that it loads slower than it should.
   *
   * Any ideas?
   */
  const highlighter = await getHighlighter({
    theme,
  })
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
                overflow: 'hidden',
                position: 'relative',
                color: highlighter.getForegroundColor(theme as string),
                caretColor: highlighter.getForegroundColor(theme as string),
                // backgroundColor: highlighter.getBackgroundColor(theme as string),
              }}
            >
              {children}
            </Box>
          </Code>
        )
      }
    },
    renderLeaf({attributes, children, leaf}) {
      if (leaf.data?.color) {
        return (
          <span style={{color: leaf.data.color as string}} {...attributes}>
            {children}
          </span>
        )
      }
    },
    decorate([node, path]) {
      const ranges: Array<Range> = []

      if (isText(node)) {
        const [code] =
          Editor.above(editor, {
            at: path,
            match: isCode,
          }) || []

        if (!code) return []

        const [tokens] = highlighter.codeToThemedTokens(node.value, code.lang)
        let offset = 0

        for (const token of tokens) {
          const range: Range & Record<string, unknown> = {
            anchor: {path, offset},
            focus: {path, offset: offset + token.content.length},
            data: {
              color: token.color,
            },
          }

          if (token.fontStyle === 1) range[MARK_EMPHASIS] = true
          if (token.fontStyle === 2) range[MARK_STRONG] = true
          if (token.fontStyle === 4) range[MARK_UNDERLINE] = true

          ranges.push(range)
          offset += token.content.length
        }
      }

      return ranges
    },
  }
}
