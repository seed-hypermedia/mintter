import React, { createContext, useContext } from 'react';

import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import type { SlateBlock } from '@mintter/editor/editor';

export interface MenuItemProps {
  label: string;
  onClick?: (block: SlateBlock) => void;
  menu?: MenuItemProps[];
  icon?: any;
}

export interface OnQuoteOptions {
  block: SlateBlock;
  destination?: documents.Document.AsObject;
}

export interface BlockMenuContextType {
  blockId: string | null;
  onQuote?: (data: OnQuoteOptions) => void;
  onCopyBlockId?: (id?: string) => boolean;
  onSidePanel?: (blockId: string) => void;
  useDocument?: any;
  drafts?: documents.Document.AsObject[];
}

export interface BlockMenuProviderProps {
  children: any;
  reducer?: (state: BlockMenuContextType, action: any) => BlockMenuContextType;
  initialState?: BlockMenuContextType;
  stateInitializer?: () => BlockMenuContextType;
}

const defaultState: BlockMenuContextType = {
  blockId: null,
  onSidePanel: () => console.log('Implement me!'),
  onQuote: () => console.log('Implement me!'),
  useDocument: () => console.log('Implement me!'),
  drafts: [],
};

// TODO: fix types
function defaultReducer(state: any, { payload }: any) {
  return {
    ...state,
    ...payload,
  };
}

export const BlockMenuContext = createContext<BlockMenuContextType>(
  defaultState,
);

export const BlockmenuSendContext = createContext<any>(defaultReducer);

export function BlockMenuProvider({
  children,
  reducer = defaultReducer,
  initialState = defaultState,
}: BlockMenuProviderProps) {
  const [state, send] = React.useReducer(reducer, initialState);
  return (
    <BlockmenuSendContext.Provider value={send}>
      <BlockMenuContext.Provider value={state}>
        {children}
      </BlockMenuContext.Provider>
    </BlockmenuSendContext.Provider>
  );
}

export function useBlockMenu() {
  const context = useContext(BlockMenuContext);
  if (context === undefined) {
    throw new Error(
      `\`useBlockMenu\` must be used within a \`BlockMenuProvider\``,
    );
  }

  return context;
}

export function useBlockmenuSend() {
  const context = useContext(BlockmenuSendContext);
  if (context === undefined) {
    throw new Error(
      `\`useBlockmenuSend\` must be used within a \`BlockMenuProvider\``,
    );
  }

  return context;
}
