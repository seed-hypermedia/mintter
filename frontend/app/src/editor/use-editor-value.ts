import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import { useEffect, useReducer, useCallback } from 'react';
import { initialValue, EditorState, initialBlocksValue } from './editor';

export function initializeEditorValue() {
  // TODO: change this to a lazy initialization function later
  return initialValue;
}

// TODO: fix types
export function draftReducer(state: EditorState, action: any) {
  const { type, payload } = action;

  switch (type) {
    case 'TITLE':
      return {
        ...state,
        title: payload,
      };
    case 'SUBTITLE': {
      return {
        ...state,
        subtitle: payload,
      };
    }
    case 'BLOCKS': {
      return {
        ...state,
        blocks: payload,
      };
    }

    case 'VALUE': {
      return {
        ...state,
        ...payload,
      };
    }

    default: {
      return state;
    }
  }
}

// TODO: fix types
export function useEditorValue({ document }: any) {
  const [state, dispatch] = useReducer(
    draftReducer,
    initialValue,
    initializeEditorValue,
  );

  const setTitle = useCallback((payload) => {
    dispatch({ type: 'TITLE', payload });
  }, []);

  const setSubtitle = useCallback((payload) => {
    dispatch({ type: 'SUBTITLE', payload });
  }, []);

  const setBlocks = useCallback((payload) => {
    dispatch({ type: 'BLOCKS', payload });
  }, []);

  const setValue = useCallback((payload) => {
    dispatch({ type: 'VALUE', payload });
  }, []);

  // useEffect(() => {
  //   if (document) {
  //     const { document: doc, blocksMap } = document;
  //     const { title = '', subtitle, blockRefList, author } = doc;
  //     const mentions = getMentions(blocksMap);
  //     const blocks = toSlateTree({
  //       blockRefList,
  //       blocksMap,
  //       isRoot: true,
  //     });

  //     setValue({
  //       title,
  //       author,
  //       subtitle,
  //       mentions,
  //       blocks: blocks ? blocks : initialBlocksValue,
  //     });
  //   }
  // }, [document, setValue]);

  return {
    state,
    setTitle,
    setSubtitle,
    setBlocks,
    setValue,
  };
}

// TODO: fix types
function getMentions(blocksMap: documents.Block.AsObject[]) {
  const mentions = blocksMap.reduce((acc: any, entry: any) => {
    const block: documents.Block.AsObject = entry[1];

    // if (block.quotersList && block.quotersList.length) {
    //   acc.push(...block.quotersList.map((version) => `${version}/${entry[0]}`));
    // }

    return acc;
  }, []);

  return mentions;
}
