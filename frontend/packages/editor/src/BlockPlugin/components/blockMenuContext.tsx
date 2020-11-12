import {Document} from '@mintter/api/v2/documents_pb'
import {SlateBlock} from 'editor'
import React, {createContext, useContext} from 'react'

export interface BlockMenuContextType {
  state: BlockMenuContextState
  dispatch: any
}

export interface MenuItemProps {
  label: string
  onClick?: (block: SlateBlock) => void
  menu?: MenuItemProps[]
  icon?: any
}

export interface OnQuoteOptions {
  block: SlateBlock
  destination?: Document.AsObject
}

export interface BlockMenuContextState {
  blockId: string | null
  onQuote?: (data: OnQuoteOptions) => void
  onInteractionPanel?: (block: SlateBlock) => void
  drafts?: Document.AsObject[]
}

export interface BlockMenuProviderProps {
  children: any
  reducer?: (state: BlockMenuContextState, action: any) => BlockMenuContextState
  initialState?: BlockMenuContextState
  stateInitializer?: () => BlockMenuContextState
}

const defaultState: BlockMenuContextState = {
  blockId: null,
  onInteractionPanel: () => console.log('Implement me!'),
  onQuote: () => console.log('Implement me!'),
  drafts: [],
}

function defaultReducer(state, {payload}) {
  return {
    ...state,
    ...payload,
  }
}

export const BlockMenuContext = createContext<BlockMenuContextType>({
  state: defaultState,
  dispatch: defaultReducer,
})

export function BlockMenuProvider({
  children,
  reducer = defaultReducer,
  initialState = defaultState,
}: BlockMenuProviderProps) {
  const [state, dispatch] = React.useReducer(reducer, initialState)

  return (
    <BlockMenuContext.Provider value={{state, dispatch}}>
      {children}
    </BlockMenuContext.Provider>
  )
}

export function useBlockMenu() {
  const context = useContext(BlockMenuContext)

  if (context === undefined) {
    throw new Error(
      `\`useBlockMenu\` must be used within a \`BlockMenuProvider\``,
    )
  }

  return context
}
