import {getNodes, useStoreEditorState} from '@udecode/slate-plugins'
import {useMemo, useReducer} from 'react'
import {Editor} from 'slate'
import {MINTTER_LINK_PREFIX} from './link-plugin'
import type {EditorBlock, EditorInlineElement, EditorLink, EditorQuote} from './types'
import {useNodePath} from './use-node-path'

function documentsReducer(state, action) {
  if (action.type === 'ADD') {
    return {
      ...state,
    }
  }
}

export function useLinkEmbeds(block: EditorBlock): any {
  const editor = useStoreEditorState()
  const path = useNodePath(editor, block)

  return getNodes(editor, {
    at: path,
    match: (n: EditorLink | EditorQuote) => !!n.url && n.url.includes(MINTTER_LINK_PREFIX),
  })
}
