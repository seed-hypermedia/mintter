import {Document} from '@mintter/api/v2/documents_pb'
import {SlateBlock} from 'editor'
import React, {createContext, useContext} from 'react'
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

export interface BlockMenuContextType {
  blockId: string | null
  onQuote?: (data: OnQuoteOptions) => void
  onSidePanel?: (blockId: string) => void
  useDocument?: any
  drafts?: Document.AsObject[]
}

export interface BlockMenuProviderProps {
  children: any
  reducer?: (state: BlockMenuContextType, action: any) => BlockMenuContextType
  initialState?: BlockMenuContextType
  stateInitializer?: () => BlockMenuContextType
}

const defaultState: BlockMenuContextType = {
  blockId: null,
  onSidePanel: () => console.log('Implement me!'),
  onQuote: () => console.log('Implement me!'),
  useDocument: () => console.log('Implement me!'),
  drafts: [],
}

function defaultReducer(state, {payload}) {
  return {
    ...state,
    ...payload,
  }
}

export const BlockMenuContext = createContext<BlockMenuContextType>(
  defaultState,
)

export const BlockMenuDispatchContext = createContext<any>(defaultReducer)

export function BlockMenuProvider({
  children,
  reducer = defaultReducer,
  initialState = defaultState,
}: BlockMenuProviderProps) {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  return (
    <BlockMenuDispatchContext.Provider value={dispatch}>
      <BlockMenuContext.Provider value={state}>
        {children}
      </BlockMenuContext.Provider>
    </BlockMenuDispatchContext.Provider>
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

export function useBlockMenuDispatch() {
  const context = useContext(BlockMenuDispatchContext)
  if (context === undefined) {
    throw new Error(
      `\`useBlockMenuDispatch\` must be used within a \`BlockMenuProvider\``,
    )
  }

  return context
}
