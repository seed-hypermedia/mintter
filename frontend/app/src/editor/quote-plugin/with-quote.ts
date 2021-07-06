import {createId} from '@mintter/client/mocks'
import {getAbove, isCollapsed} from '@udecode/slate-plugins'
import type {SPEditor, WithOverride} from '@udecode/slate-plugins-core'
import {Editor, Transforms} from 'slate'
import type {ReactEditor} from 'slate-react'
import {ELEMENT_QUOTE} from './create-quote-plugin'

export function withQuote(): WithOverride<ReactEditor & SPEditor> {
  return (editor) => {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type === ELEMENT_QUOTE) {
        if (!node.id) {
          Transforms.setNodes(editor, {id: createId()}, {at: path})
          return
        }
      }

      normalizeNode(entry)
    }

    return editor
  }
}
