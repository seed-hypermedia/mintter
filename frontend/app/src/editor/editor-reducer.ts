import {useReducer} from 'react'
import {BlockType, ListStyle} from '@mintter/client'
import {ELEMENT_BLOCK} from './block-plugin'
import type {EditorBlock} from './types'
import * as mocks from '@mintter/client/mocks'

export type EditorState = {
  title: string
  subtitle: string
  blocks: Array<EditorBlock>
}

export type EditorAction =
  | {
      type: 'title'
      payload: string
    }
  | {
      type: 'subtitle'
      payload: string
    }
  | {
      type: 'editor'
      payload: Array<EditorBlock>
    }
  | {
      type: 'full'
      payload: EditorState
    }

const initialValue: EditorState = {
  title: '',
  subtitle: '',
  blocks: [
    {
      type: ELEMENT_BLOCK,
      blockType: BlockType.BASIC,
      id: mocks.createId(),
      listStyle: ListStyle.NONE,
      children: [{text: ''}],
    },
  ],
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type == 'full')
    return {
      ...state,
      ...action.payload,
    }

  console.log('action', action)
  return {
    ...state,
    [action.type]: action.payload,
  }
}

export function useEditorReducer() {
  return useReducer(editorReducer, initialValue)
}
