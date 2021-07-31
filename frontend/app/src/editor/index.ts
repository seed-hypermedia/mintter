import {createGroupPlugin} from './elements/group'
import {createOrderedListPlugin} from './elements/ordered-list'
import {createParagraphPlugin} from './elements/paragraph'
import {createHeadingPlugin} from './elements/heading'
import {createStatementPlugin} from './elements/statement'
import {createStaticParagraphPlugin} from './elements/static-paragraph'
import {createUnorderedListPlugin} from './elements/unordered-list'
import type {EditorPlugin} from './types'

export const plugins: Array<EditorPlugin> = [
  createGroupPlugin(),
  createUnorderedListPlugin(),
  createOrderedListPlugin(),
  createHeadingPlugin(),
  createStaticParagraphPlugin(),
  createStatementPlugin(),
  createParagraphPlugin(),
]

export * from './editor'
export * from './use-editor-draft'
