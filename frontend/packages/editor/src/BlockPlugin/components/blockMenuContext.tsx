import React, {createContext, useContext} from 'react'

export interface BlockMenuContextType {
  state: BlockMenuContextState
  dispatch: any
}

export interface MenuItemProps {
  label: string
  onClick?: () => void
  menu?: MenuItemProps[]
}

export interface BlockMenuContextState {
  blockId: string | null
  menu: MenuItemProps[]
}

export interface BlockMenuProviderProps {
  children: any
  reducer?: (state: BlockMenuContextState, action: any) => BlockMenuContextState
  initialState?: BlockMenuContextState
  stateInitializer?: () => BlockMenuContextState
}

const defaultState: BlockMenuContextState = {
  blockId: null,
  menu: [
    {
      label: 'item from State 1',
    },
    {
      label: 'item from State 2',
    },
    {
      label: 'item from State 3',
    },
  ],
}

function defaultReducer(state, {type, payload}) {
  switch (type) {
    case 'set_block_id':
      return {
        ...state,
        blockId: payload,
      }

    default:
      return state
  }
}

export const BlockMenuContext = createContext<BlockMenuContextType>({
  state: defaultState,
  dispatch: defaultReducer,
})

export function BlockToolsProvider({
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
      `\`useBlockMenu\` must be used within a \`BlockToolsProvider\``,
    )
  }

  return context
}
