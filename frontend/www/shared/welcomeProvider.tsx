import {useContext, createContext, useReducer, useMemo} from 'react'
import {useLocation} from 'react-router-dom'
import Steps from '../components/welcome-steps'

interface WelcomeState {
  mnemonicList?: string[]
  aezeedPassphrase?: string
  progress?: number
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

const initialState: WelcomeState = {
  mnemonicList: [''],
  aezeedPassphrase: '',
  progress: undefined,
}

export const WelcomeContext = createContext<WelcomeValueType>({
  state: initialState,
})

type Action =
  | {type: 'mnemonicList'; payload: string[]}
  | {type: 'aezeedPassphrase'; payload: string}
  | {type: 'progress'; payload: number}
  | {type: 'reset'}

export function reducer(state: WelcomeState, action: Action): WelcomeState {
  switch (action.type) {
    case 'progress':
      return {...state, progress: action.payload}
    case 'mnemonicList':
      return {...state, mnemonicList: action.payload}
    case 'aezeedPassphrase':
      return {...state, aezeedPassphrase: action.payload}
    case 'reset':
      return initialState
  }
}

export default function WelcomeProvider(props: WelcomeProviderProps) {
  const location = useLocation()
  const [state, dispatch] = useReducer(reducer, initialState)

  const activeStep = useMemo(
    () => steps.findIndex(s => s.url === location.pathname),
    [location.pathname],
  )

  const v = useMemo(() => props.value || {state, dispatch}, [
    props.value,
    state,
  ])

  return (
    <>
      {activeStep >= 0 ? <Steps steps={steps} active={activeStep} /> : null}
      <WelcomeContext.Provider value={v} {...props} />
    </>
  )
}

export function useWelcome(): WelcomeValueType {
  const context = useContext<WelcomeValueType>(WelcomeContext)
  if (context === undefined) {
    throw new Error(`useWelcome must be used within a WelcomeProvider`)
  }
  return context
}

const steps = [
  {
    title: 'Security Pack',
    url: '/welcome/security-pack',
  },
  {
    title: 'Retype your Seed',
    url: '/welcome/retype-seed',
  },
  {
    title: 'Create Password',
    url: '/welcome/create-password',
  },
  {
    title: 'Edit profile',
    url: '/welcome/edit-profile',
  },
]
