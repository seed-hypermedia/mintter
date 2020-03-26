import {useContext, createContext, useReducer, useEffect} from 'react'
import {useProfile} from './profileContext'
import {useRouter} from 'next/router'

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
  | {type: 'reset'}

export function reducer(state: WelcomeState, action: Action): WelcomeState {
  switch (action.type) {
    case 'mnemonicList':
      return {...state, mnemonicList: action.payload}
    case 'aezeedPassphrase':
      return {...state, aezeedPassphrase: action.payload}
    case 'reset':
      return initialState
  }
}

export default function WelcomeProvider({
  children,
  value,
}: WelcomeProviderProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialState)
  const v = value || {state, dispatch}
  const {hasProfile} = useProfile()

  useEffect(() => {
    async function checkProfile() {
      try {
        const resp = await hasProfile()
        if (resp) {
          router.replace('/app/library')
        }
      } catch (err) {
        console.error('Error trying to redirect => ', err)
      }
    }

    checkProfile()
  }, [])

  return <WelcomeContext.Provider value={v}>{children}</WelcomeContext.Provider>
}

export function useWelcome(): WelcomeValueType {
  return useContext<WelcomeValueType>(WelcomeContext)
}
