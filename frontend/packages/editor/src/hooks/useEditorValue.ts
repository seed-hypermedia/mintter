import {Block} from '@mintter/proto/v2/documents_pb'
import {useEffect, useReducer, useCallback} from 'react'
import {initialValue, EditorState, initialBlocksValue} from '../editor'
import {toSlateTree} from '../transformers'

export function initializeEditorValue() {
  // TODO: change this to a lazy initialization function later
  return initialValue
}

export function draftReducer(state: EditorState, action) {
  const {type, payload} = action

  switch (type) {
    case 'TITLE':
      return {
        ...state,
        title: payload,
      }
    case 'SUBTITLE': {
      return {
        ...state,
        subtitle: payload,
      }
    }
    case 'BLOCKS': {
      return {
        ...state,
        blocks: payload,
      }
    }

    case 'VALUE': {
      return {
        ...state,
        ...payload,
      }
    }

    default: {
      return state
    }
  }
}

export function useEditorValue({document}) {
  const [state, dispatch] = useReducer(
    draftReducer,
    initialValue,
    initializeEditorValue,
  )

  const setTitle = useCallback(payload => {
    dispatch({type: 'TITLE', payload})
  }, [])

  const setSubtitle = useCallback(payload => {
    dispatch({type: 'SUBTITLE', payload})
  }, [])

  const setBlocks = useCallback(payload => {
    dispatch({type: 'BLOCKS', payload})
  }, [])

  const setValue = useCallback(payload => {
    dispatch({type: 'VALUE', payload})
  }, [])

  useEffect(() => {
    if (document) {
      const {document: doc, blocksMap} = document
      const {title, subtitle, blockRefList, author} = doc
      const mentions = getMentions(blocksMap)
      console.log('useEditorValue -> blocksMap', blocksMap)
      const blocks = toSlateTree({blockRefList, blocksMap, isRoot: true})

      setValue({
        title,
        author,
        subtitle,
        mentions,
        blocks: blocks ? blocks : initialBlocksValue,
      })
    }
  }, [document, setValue])

  return {
    state,
    setTitle,
    setSubtitle,
    setBlocks,
    setValue,
  }
}

function getMentions(blocksMap) {
  const mentions = blocksMap.reduce((acc, entry) => {
    const block: Block.AsObject = entry[1]
    if (block.quotersList.length) {
      acc.push(...block.quotersList)
    }

    return acc
  }, [])

  return mentions
}
