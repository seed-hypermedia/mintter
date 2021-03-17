import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Steps } from './welcome-steps';
import { Grid } from '@mintter/ui-legacy/grid';

interface WelcomeState {
  mnemonicList?: string[];
  aezeedPassphrase?: string;
  progress?: number;
}

type WelcomeValueType = {
  state: WelcomeState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch?: any;
};

export interface WelcomeProviderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: WelcomeValueType;
}

const initialState: WelcomeState = {
  mnemonicList: [''],
  aezeedPassphrase: '',
  progress: undefined,
};

export const WelcomeContext = React.createContext<WelcomeValueType>({
  state: initialState,
});

type Action =
  | { type: 'mnemonicList'; payload: string[] }
  | { type: 'aezeedPassphrase'; payload: string }
  | { type: 'progress'; payload: number }
  | { type: 'reset' };

export function reducer(state: WelcomeState, action: Action): WelcomeState {
  switch (action.type) {
    case 'progress':
      return { ...state, progress: action.payload };
    case 'mnemonicList':
      return { ...state, mnemonicList: action.payload };
    case 'aezeedPassphrase':
      return { ...state, aezeedPassphrase: action.payload };
    case 'reset':
      return initialState;
  }
}

export function WelcomeProvider(props: WelcomeProviderProps) {
  const location = useLocation();
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const activeStep = React.useMemo(
    () => steps.findIndex((s) => s.url === location.pathname),
    [location.pathname],
  );
  const v = React.useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
  );

  return (
    <Grid
      css={{
        width: '100vw',
        height: '100vh',
        gridTemplateRows: '[welcome-steps] 150px [welcome-content] 1fr',
      }}
    >
      <Steps steps={steps} active={activeStep} />
      <WelcomeContext.Provider value={{ ...v, ...props.value }} {...props} />
    </Grid>
  );
}

export function useWelcome(): WelcomeValueType {
  const context = React.useContext<WelcomeValueType>(WelcomeContext);
  if (context === undefined) {
    throw new Error(`useWelcome must be used within a WelcomeProvider`);
  }
  return context;
}

const steps = [
  {
    title: 'Security Pack',
    url: '/welcome/security-pack',
  },
  // {
  //   title: 'Retype your seed',
  //   url: '/welcome/retype-seed',
  // },
  // {
  //   title: 'Create Password',
  //   url: '/welcome/create-password',
  // },
  {
    title: 'Edit profile',
    url: '/welcome/edit-profile',
  },
  {
    title: 'Complete',
    url: '/welcome/complete',
  },
];
