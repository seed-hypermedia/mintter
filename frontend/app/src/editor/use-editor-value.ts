import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import { useEffect, useReducer, useCallback } from 'react';
import { initialValue, EditorState, initialBlocksValue } from './editor';

export function initializeEditorValue() {
  // TODO: change this to a lazy initialization function later
  return initialValue;
}

type EditorAction =
  | { type: 'TITLE'; payload: string }
  | { type: 'SUBTITLE'; payload: string }
  | { type: 'BLOCKS'; payload: number }
  | { type: 'VALUE'; payload: Partial<EditorState> };

// TODO: fix types
export function draftReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  const { type, payload } = action;

  switch (type) {
    case 'TITLE':
      return {
        ...state,
        title: payload as string,
      };
    case 'SUBTITLE': {
      return {
        ...state,
        subtitle: payload as string,
      };
    }
    case 'BLOCKS': {
      return {
        ...state,
        blocks: payload as any,
      };
    }

    case 'VALUE': {
      return {
        ...state,
        ...(payload as any),
      };
    }

    default: {
      return state;
    }
  }
}

export function useEditorValue({
  document,
}: {
  document?: documents.Document.AsObject;
}) {
  const [state, dispatch] = useReducer(draftReducer, initialValue);

  const setTitle = useCallback((payload: string) => {
    dispatch({ type: 'TITLE', payload });
  }, []);

  const setSubtitle = useCallback((payload: string) => {
    dispatch({ type: 'SUBTITLE', payload });
  }, []);

  // TODO: fix types
  const setBlocks = useCallback((payload: any) => {
    dispatch({ type: 'BLOCKS', payload });
  }, []);

  const setValue = useCallback((payload: Partial<EditorState>) => {
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
