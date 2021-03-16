import * as React from 'react';

type SidepanelAction =
  | { type: 'SIDEPANEL_TOOGLE' }
  | { type: 'SIDEPANEL_OPEN' }
  | { type: 'SIDEPANEL_CLOSE' }
  | { type: 'SIDEPANEL_ADD_OBJECT'; payload: string }
  | { type: 'SIDEPANEL_REMOVE_OBJECT'; payload: string };

export type SidepanelReducerState = {
  visible: boolean;
  objects: string[];
};

export type SidepanelContextValue = {
  isSidepanelOpen: boolean;
  sidepanelObjects: string[];
  sidepanelSend?: React.Dispatch<SidepanelAction>;
};

const sidePanelInitialState: SidepanelContextValue = {
  isSidepanelOpen: false,
  sidepanelObjects: [],
};

export const SidePanelContext = React.createContext<SidepanelContextValue>(
  sidePanelInitialState,
);

function sidepanelReducer(
  state: SidepanelReducerState,
  action: SidepanelAction,
): SidepanelReducerState {
  if (action.type === 'SIDEPANEL_ADD_OBJECT') {
    if (state.objects.includes(action.payload)) {
      return {
        ...state,
        visible: true,
      };
    }

    return {
      visible: true,
      objects: [action.payload, ...state.objects],
    };
  }

  if (action.type === 'SIDEPANEL_REMOVE_OBJECT') {
    const newObjects = state.objects.filter((obj) => obj !== action.payload);

    return {
      ...state,
      objects: newObjects,
    };
  }

  if (action.type === 'SIDEPANEL_TOOGLE') {
    return {
      ...state,
      visible: !state.visible,
    };
  }

  if (action.type === 'SIDEPANEL_OPEN') {
    return {
      ...state,
      visible: true,
    };
  }

  if (action.type === 'SIDEPANEL_CLOSE') {
    return {
      ...state,
      visible: false,
    };
  }

  return state;
}

const initialReducerState: SidepanelReducerState = {
  visible: false,
  objects: [],
};

export const SidePanelProvider: React.FC<{}> = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    sidepanelReducer,
    initialReducerState,
  );

  const value = React.useMemo<SidepanelContextValue>(
    () => ({
      isSidepanelOpen: state.visible,
      sidepanelObjects: state.objects,
      sidepanelSend: dispatch,
    }),
    [state, dispatch],
  );

  return (
    <SidePanelContext.Provider value={value}>
      {children}
    </SidePanelContext.Provider>
  );
};

export function useSidePanel() {
  const context = React.useContext<SidepanelContextValue>(SidePanelContext);

  if (!context) {
    throw new Error(
      `"useSidePanel" must be called within a "<SidePanelProvider />" component`,
    );
  }

  return context;
}
