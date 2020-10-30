import React from 'react'

export interface InteractionPanelAction {
  type: string
  payload?: any
}

export interface InteractionPanelState {
  visible: boolean
  objects: string[]
}

export interface InteractionPanelContextValue {
  state: InteractionPanelState
  dispatch?: any
}

const interactionPanelInitialState: InteractionPanelState = {
  visible: false,
  objects: [],
}

export const InteractionPanelContext = React.createContext<
  InteractionPanelContextValue
>({
  state: interactionPanelInitialState,
})

function objectsReducer(
  state: InteractionPanelState,
  {type, payload}: InteractionPanelAction,
): InteractionPanelState {
  if (type === 'add_object') {
    if (state.objects.includes(payload)) {
      return {
        ...state,
        visible: true,
      }
    }

    return {
      visible: true,
      objects: [...state.objects, payload],
    }
  }

  if (type === 'add_mentions') {
    let newObjects = payload.objects
      .filter(str => str.split('/').length === 2)
      .filter(version => !state.objects.includes(version))
    return {
      ...state,
      ...payload,
      objects: [...state.objects, ...newObjects],
    }
  }

  if (type === 'toggle_panel') {
    return {
      ...state,
      visible: !state.visible,
    }
  }

  if (type === 'open_panel') {
    return {
      ...state,
      visible: true,
    }
  }

  if (type === 'close_panel') {
    return {
      ...state,
      visible: false,
    }
  }

  if (type === 'remove_object') {
    const newObjects = state.objects.filter(obj => obj !== payload)

    return {
      ...state,
      objects: newObjects,
    }
  }

  return state
}

export function InteractionPanelProvider({children}) {
  const [state, dispatch] = React.useReducer(
    objectsReducer,
    interactionPanelInitialState,
  )
  return (
    <InteractionPanelContext.Provider value={{state, dispatch}}>
      {children}
    </InteractionPanelContext.Provider>
  )
}

export function useInteractionPanel() {
  let context = React.useContext(InteractionPanelContext)

  if (!context) {
    throw new Error(
      `"useInteractionPanel" must be called within a "<InteractionPanelProvider />" component`,
    )
  }

  return context
}
