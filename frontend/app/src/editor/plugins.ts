import {Transforms} from 'slate'
import {createBlockquotePlugin} from './blockquote'
import {createCodePlugin} from './code'
import {createColorPlugin} from './color'
import {createEmbedPlugin} from './embed'
import {createEmphasisPlugin} from './emphasis'
// import {extensionsPlugin} from './extensions-plugin'
import {createFindPlugin} from './find'
import {createGroupPlugin} from './group'
import {createHeadingPlugin} from './heading'
import {createImagePlugin} from './image/image'
import {createInlineCodePlugin} from './inline-code'
import {createLinkPlugin} from './link'
import {createMarkdownShortcutsPlugin} from './markdown-plugin'
import {createMintterChangesPlugin} from './mintter-changes/plugin'
import {createParagraphPlugin} from './paragraph'
import {createPlainTextPastePlugin} from './paste-plugin'
import {createStatementPlugin} from './statement'
import {createStaticParagraphPlugin} from './static-paragraph'
import {createStrikethroughPlugin} from './strikethrough'
import {createStrongPlugin} from './strong'
import {createSubscriptPlugin} from './subscript'
import {createSuperscriptPlugin} from './superscript'
import {createTabPlugin} from './tab-plugin'
import type {EditorPlugin} from './types'
import {createUnderlinePlugin} from './underline'
import {createVideoPlugin} from './video/video'

export const plugins: EditorPlugin[] = [
  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createStrikethroughPlugin(),
  createSuperscriptPlugin(),
  createSubscriptPlugin(),
  createColorPlugin(),
  createInlineCodePlugin(),

  createLinkPlugin(),
  createEmbedPlugin(),
  createVideoPlugin(),
  createImagePlugin(),

  createStaticParagraphPlugin(),
  createParagraphPlugin(),

  createHeadingPlugin(),
  createStatementPlugin(),

  createBlockquotePlugin(),
  createCodePlugin({theme: 'github-light'}),

  createGroupPlugin(),

  createTabPlugin(),
  createMarkdownShortcutsPlugin(),
  createPlainTextPastePlugin(),
  createMintterChangesPlugin(),
  {
    name: 'selectAllPlugin',
    onKeyDown: (editor) => (event) => {
      if (event.metaKey && event.key == 'a') {
        event.preventDefault()
        Transforms.select(editor, [])
        return
      }
    },
  },

  createFindPlugin(),
  // extensionsPlugin(['./ext_twitter.wasm', './ext_youtube.wasm']),
]
