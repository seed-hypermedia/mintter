import React from 'react'

export interface sidePanelAction {
  type: string
  payload?: any
}

export interface sidePanelState {
  visible: boolean
  objects: string[]
}

export interface sidePanelContextValue {
  state: sidePanelState
  dispatch?: any
}

const sidePanelInitialState: sidePanelState = {
  visible: false,
  objects: [],
}

export const sidePanelContext = React.createContext<sidePanelContextValue>({
  state: sidePanelInitialState,
})

function objectsReducer(
  state: sidePanelState,
  {type, payload}: sidePanelAction,
): sidePanelState {
  if (type === 'add_object') {
    if (state.objects.includes(payload)) {
      return {
        ...state,
        visible: true,
      }
    }

    return {
      visible: true,
      objects: [payload, ...state.objects],
    }
  }

  if (type === 'add_mentions') {
    const newObjects = payload.objects
      .filter(str => str.split('/')[0])
      .filter(version => !state.objects.includes(version))

    return {
      ...state,
      ...payload,
      objects: [...newObjects, ...state.objects],
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

export function SidePanelProvider({children}) {
  const [state, dispatch] = React.useReducer(
    objectsReducer,
    sidePanelInitialState,
  )
  return (
    <sidePanelContext.Provider value={{state, dispatch}}>
      {children}
    </sidePanelContext.Provider>
  )
}

export function useSidePanel() {
  const context = React.useContext(sidePanelContext)

  if (!context) {
    throw new Error(
      `"useSidePanel" must be called within a "<SidePanelProvider />" component`,
    )
  }

  return context
}
