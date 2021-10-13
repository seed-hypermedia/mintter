import {createBlockquotePlugin} from './blockquote'
import {createCodePlugin} from './code'
import {createColorPlugin} from './color'
import {createEmbedPlugin} from './embed'
import {createEmphasisPlugin} from './emphasis'
import {createGroupPlugin} from './group'
import {createHeadingPlugin} from './heading'
import {createLinkPlugin} from './link'
import {createMarkdownShortcutsPlugin} from './markdown-plugin'
import {createOrderedListPlugin} from './ordered-list'
import {createParagraphPlugin} from './paragraph'
import {createStatementPlugin} from './statement'
import {createStaticParagraphPlugin} from './static-paragraph'
import {createStrikethroughPlugin} from './strikethrough'
import {createStrongPlugin} from './strong'
import {createSubscriptPlugin} from './subscript'
import {createSuperscriptPlugin} from './superscript'
import {createTabPlugin} from './tab-plugin'
import type {EditorPlugin} from './types'
import {createUnderlinePlugin} from './underline'
import {createUnorderedListPlugin} from './unordered-list'

export const plugins: EditorPlugin[] = [
  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createStrikethroughPlugin(),
  createSuperscriptPlugin(),
  createSubscriptPlugin(),
  createColorPlugin(),

  createLinkPlugin(),
  createEmbedPlugin(),

  createStaticParagraphPlugin(),
  createParagraphPlugin(),

  createHeadingPlugin(),
  createStatementPlugin(),

  createBlockquotePlugin(),
  createCodePlugin({theme: 'github-light'}),

  createGroupPlugin(),
  createUnorderedListPlugin(),
  createOrderedListPlugin(),

  createTabPlugin(),
  createMarkdownShortcutsPlugin(),
]
