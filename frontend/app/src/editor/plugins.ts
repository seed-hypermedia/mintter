import {createBlockquotePlugin} from './elements/blockquote'
import {createCodePlugin} from './elements/code'
import {createEmbedPlugin} from './elements/embed'
import {createGroupPlugin} from './elements/group'
import {createHeadingPlugin} from './elements/heading'
import {createLinkPlugin} from './elements/link'
import {createOrderedListPlugin} from './elements/ordered-list'
import {createParagraphPlugin} from './elements/paragraph'
import {createStatementPlugin} from './elements/statement'
import {createStaticParagraphPlugin} from './elements/static-paragraph'
import {createUnorderedListPlugin} from './elements/unordered-list'
import {createColorPlugin} from './leafs/color'
import {createEmphasisPlugin} from './leafs/emphasis'
import {createStrikethroughPlugin} from './leafs/strikethrough'
import {createStrongPlugin} from './leafs/strong'
import {createSubscriptPlugin} from './leafs/subscript'
import {createSuperscriptPlugin} from './leafs/superscript'
import {createUnderlinePlugin} from './leafs/underline'
import {createMarkdownShortcutsPlugin} from './markdown-plugin'
import {createTabPlugin} from './tab-plugin'
import type {EditorPlugin} from './types'

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
