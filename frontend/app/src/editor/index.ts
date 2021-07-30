import {createGroupPlugin} from './elements/group'
import {createParagraphPlugin} from './elements/paragraph'
import {createStatementPlugin} from './elements/statement'
import type {EditorPlugin} from './types'

export const plugins: Array<EditorPlugin> = [createGroupPlugin(), createStatementPlugin(), createParagraphPlugin()]

export * from './editor'
export * from './use-editor-draft'
