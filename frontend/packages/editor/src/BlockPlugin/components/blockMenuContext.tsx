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

export interface BlockMenuContextState {
  blockId: string | null
  menu: {
    block: MenuItemProps[]
    transclusion: MenuItemProps[]
  }
}

export interface BlockMenuProviderProps {
  children: any
  reducer?: (state: BlockMenuContextState, action: any) => BlockMenuContextState
  initialState?: BlockMenuContextState
  stateInitializer?: () => BlockMenuContextState
}

const defaultState: BlockMenuContextState = {
  blockId: null,
  menu: {
    block: [],
    transclusion: [],
  },
}

function defaultReducer(state, {type, payload}) {
  switch (type) {
    case 'set_block_id':
      return {
        ...state,
        blockId: payload,
      }

    case 'set_menu':
      console.log(`blockId on "set_menu" = `, state.blockId)
      return {
        ...state,
        menu: payload,
      }
    default:
      return state
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
