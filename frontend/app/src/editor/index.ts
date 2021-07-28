import type {EditorPlugin} from 'mixtape'
import {createGroupPlugin} from './elements/group'
import {createParagraphPlugin} from './elements/paragraph'
import {createStatementPlugin} from './elements/statement'

export const plugins: Array<EditorPlugin> = [createGroupPlugin(), createStatementPlugin(), createParagraphPlugin()]

export * from './use-editor-draft'
