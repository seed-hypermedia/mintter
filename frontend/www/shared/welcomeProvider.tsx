import {useContext, createContext, useReducer} from 'react'

interface WelcomeState {
  seed?: string[]
  passphrase?: string
}

const initialState: WelcomeState = {
  seed: [''],
  passphrase: '',
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
  | {type: 'seed'; payload: string[]}
  | {type: 'passphrase'; payload: string}

export function reducer(state: WelcomeState, action: Action): WelcomeState {
  switch (action.type) {
    case 'seed':
      return {...state, seed: action.payload}
    case 'passphrase':
      return {...state, passphrase: action.payload}
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
