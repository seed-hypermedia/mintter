import {InterpreterFrom} from 'xstate'
import {authStateMachine} from './authstate-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [AuthProvider, useAuth, createAuthSelector] =
  createInterpreterContext<InterpreterFrom<typeof authStateMachine>>('Auth')

export {AuthProvider, useAuth}

export const useAccountInfo = createAuthSelector((state) => state.context.accountInfo)
