import {useContext, createContext, useReducer} from 'react'

interface WelcomeState {
  mnemonicList?: string[]
  aezeedPassphrase?: string
}

const initialState: WelcomeState = {
  mnemonicList: [''],
  aezeedPassphrase: '',
}

type WelcomeValueType = {
  state: WelcomeState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch?: any
}

export interface WelcomeProviderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: WelcomeValueType
}

export const WelcomeContext = createContext<WelcomeValueType>({
  state: initialState,
})

type Action =
  | {type: 'mnemonicList'; payload: string[]}
  | {type: 'aezeedPassphrase'; payload: string}

export function reducer(state: WelcomeState, action: Action): WelcomeState {
  switch (action.type) {
    case 'mnemonicList':
      return {...state, mnemonicList: action.payload}
    case 'aezeedPassphrase':
      return {...state, aezeedPassphrase: action.payload}
  }
}

export default function WelcomeProvider({
  children,
  value,
}: WelcomeProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const v = value || {state, dispatch}
  return <WelcomeContext.Provider value={v}>{children}</WelcomeContext.Provider>
}

export function useWelcome(): WelcomeValueType {
  return useContext<WelcomeValueType>(WelcomeContext)
}
