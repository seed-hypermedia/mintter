import {authStateMachine} from 'frontend/app/src/authstate-machine'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'
const [AuthProvider, useAuth, createAuthSelector] =
  createInterpreterContext<InterpreterFrom<typeof authStateMachine>>('Auth')

export {AuthProvider, useAuth}

export const useAccountInfo = createAuthSelector((state) => state.context.accountInfo)
