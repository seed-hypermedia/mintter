import {createGroupPlugin} from './elements/group'
import {createOrderedListPlugin} from './elements/ordered-list'
import {createParagraphPlugin} from './elements/paragraph'
import {createHeadingPlugin} from './elements/heading'
import {createStatementPlugin} from './elements/statement'
import {createStaticParagraphPlugin} from './elements/static-paragraph'
import {createUnorderedListPlugin} from './elements/unordered-list'
import {createLinkPlugin} from './elements/link'
import type {EditorPlugin} from './types'
import {createStrongPlugin} from './leafs/strong'
import {createEmphasisPlugin} from './leafs/emphasis'
import {createUnderlinePlugin} from './leafs/underline'
import {createStrikethroughPlugin} from './leafs/strikethrough'
import {createSuperscriptPlugin} from './leafs/superscript'
import {createSubscriptPlugin} from './leafs/subscript'
import {createBlockquotePlugin} from './elements/blockquote'
import {createEmbedPlugin} from './elements/embed'
import {createCodePlugin} from './elements/code'
import {createTabPlugin} from './tab-plugin'
import {createMarkdownShortcutsPlugin} from './markdown-plugin'
import {createColorPlugin} from './leafs/color'

export const plugins: Array<EditorPlugin | Promise<EditorPlugin>> = [
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
