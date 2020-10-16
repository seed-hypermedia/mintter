import React from 'react'

const InteractionPanelContext = React.createContext()

interface InteractionPanelState {
  visible: boolean
}

interface InteractionPanelAction {
  type: string
  payload: Partial<InteractionPanelState>
}

const interactionPanelInitialState: InteractionPanelState = {
  visible: false,
}

function interactionPanelDefaultReducer(
  state: InteractionPanelState,
  action: InteractionPanelAction,
): InteractionPanelState {
  return {
    ...state,
    ...action.payload,
  }
}

function InteractionPanelProvider({children}) {
  const reducedValue = React.useReducer()
  return (
    <InteractionPanelContext.Provider value={{}}>
      {children}
    </InteractionPanelContext.Provider>
  )
}

function useInteractionPanel() {
  const context = React.useContext(InteractionPanelContext)

  if (!context) {
    throw new Error(
      `"useInteractionPanel" should be called withing a "InteractionPanelProvider"`,
    )
  }

  return context
}
