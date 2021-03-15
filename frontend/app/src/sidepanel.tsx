import * as React from 'react';

export type sidePanelAction = {
  type: string;
  payload?: any;
};

export type sidePanelState = {
  visible: boolean;
  objects: string[];
};

export type SidePanelContextValue = {
  state: sidePanelState;
  dispatch?: any;
};

const sidePanelInitialState: sidePanelState = {
  visible: false,
  objects: [],
};

export const SidePanelContext = React.createContext<SidePanelContextValue>({
  state: sidePanelInitialState,
});

function objectsReducer(
  state: sidePanelState,
  { type, payload }: sidePanelAction,
): sidePanelState {
  if (type === 'add_object') {
    if (state.objects.includes(payload)) {
      return {
        ...state,
        visible: true,
      };
    }

    return {
      visible: true,
      objects: [payload, ...state.objects],
    };
  }

  if (type === 'toggle_panel') {
    return {
      ...state,
      visible: !state.visible,
    };
  }

  if (type === 'open_panel') {
    return {
      ...state,
      visible: true,
    };
  }

  if (type === 'close_panel') {
    return {
      ...state,
      visible: false,
    };
  }

  if (type === 'remove_object') {
    const newObjects = state.objects.filter((obj) => obj !== payload);

    return {
      ...state,
      objects: newObjects,
    };
  }

  return state;
}

export const SidePanelProvider: React.FC = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    objectsReducer,
    sidePanelInitialState,
  );
  console.log(
    '🚀 ~ file: sidepanel.tsx ~ line 83 ~ state, dispatch',
    state,
    dispatch,
  );
  return (
    <SidePanelContext.Provider value={{ state, dispatch }}>
      {children}
    </SidePanelContext.Provider>
  );
};

export function useSidePanel() {
  const context = React.useContext(SidePanelContext);

  if (!context) {
    throw new Error(
      `"useSidePanel" must be called within a "<SidePanelProvider />" component`,
    );
  }

  return context;
}
