import type {EditorPlugin} from '../types'
import {Element, Node, Text} from 'slate'
import type {BaseRange} from 'slate'
import {setCDN, getHighlighter} from 'shiki'
import MintterGrammer from './mintter.tmLanguage.json'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_UNDERLINE} from '../leafs/underline'

export const createMDHighlightPlugin = async (): Promise<EditorPlugin> => {
  /**
   * @todo bundle themes, languages & onigasm
   * @body Our monorepo setup doesn't allow us to point shiki to a local file path so we point it to unpkg. This should be changed and all language file, theme files and onigasm binary bundled into the app
   */
  setCDN('https://unpkg.com/shiki/')

  const highlighter = await getHighlighter({
    theme: 'github-light',
    langs: [
      {
        id: 'mintter',
        scopeName: 'text.mintter',
        aliases: ['mtt'],
        //@ts-ignore
        grammar: MintterGrammer,
      },
    ],
  })

  return {
    name: 'markdown highlight',
    renderLeaf(props) {
      if (props.leaf.data?.color) {
        props.children = (
          <span style={{color: props.leaf.data?.color as string}} {...props.attributes}>
            {props.children}
          </span>
        )
      }
    },
    decorate(entry) {
      const [node, path] = entry
      const ranges = []

      if (Text.isText(node)) {
        const [tokens] = highlighter.codeToThemedTokens(node.value, 'mintter')

        let offset = 0

        for (const token of tokens) {
          const range: BaseRange & Record<string, unknown> = {
            anchor: {path, offset},
            focus: {path, offset: offset + token.content.length},
            data: {
              color: token.color,
              scopes: token.explanation?.flatMap((e) => e.scopes.map((s) => s.scopeName)),
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
