import {SizableText} from '@mintter/ui'
import type {EditorPlugin} from '../types'

export const MARK_CODE = 'code'

export const createInlineCodePlugin = (): EditorPlugin => ({
  name: MARK_CODE,
})
