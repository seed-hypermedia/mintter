import {createBlockquotePlugin} from './elements/blockquote'
import {createCodePlugin} from './elements/code'
import {createGroupPlugin} from './elements/group'
import {createLinkPlugin} from './elements/link'
import {createOrderedListPlugin} from './elements/ordered-list'
import {createUnorderedListPlugin} from './elements/unordered-list'
import {createEmbedPlugin} from './embed'
import {createHeadingPlugin} from './heading'
import {createColorPlugin} from './leafs/color'
import {createEmphasisPlugin} from './leafs/emphasis'
import {createStrikethroughPlugin} from './leafs/strikethrough'
import {createStrongPlugin} from './leafs/strong'
import {createSubscriptPlugin} from './leafs/subscript'
import {createSuperscriptPlugin} from './leafs/superscript'
import {createUnderlinePlugin} from './leafs/underline'
import {createMarkdownShortcutsPlugin} from './markdown-plugin'
import {createParagraphPlugin} from './paragraph'
import {createStatementPlugin} from './statement'
import {createStaticParagraphPlugin} from './static-paragraph'
import {createTabPlugin} from './tab-plugin'
import type {EditorPlugin} from './types'

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
