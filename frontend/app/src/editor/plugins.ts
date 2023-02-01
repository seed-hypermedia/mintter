import {createCommentsPlugin} from '@app/editor/comments/comments'
import {EditorMode} from '@app/editor/plugin-utils'
import {isFlowContent} from '@mintter/shared'
import {Editor, Path, Range, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {createBlockquotePlugin} from './blockquote'
import {createCodePlugin} from './code'
import {createColorPlugin} from './color'
import {createEmbedPlugin} from './embed'
import {createEmphasisPlugin} from './emphasis'
// import {extensionsPlugin} from './extensions-plugin'
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
  createCodePlugin(),
  createGroupPlugin(),
  createTabPlugin(),
  createMarkdownShortcutsPlugin(),
  createPlainTextPastePlugin(),
  createMintterChangesPlugin(),
  // createFindPlugin(),
  // extensionsPlugin(['./ext_twitter.wasm', './ext_youtube.wasm']),
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
  {
    name: 'prevent double accent letters',
    onCompositionEnd: () => (e) => {
      // this plugin prevents to add extra characters when "composing"
      // when we add accents we are composing
      e.preventDefault()
      e.stopPropagation()
    },
  },
  createCommentsPlugin(),
]
