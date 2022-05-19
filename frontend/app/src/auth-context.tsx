import {InterpreterFrom} from 'xstate'
import {authMachine} from './auth-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [AuthProvider, useAuth, createAuthSelector] =
  createInterpreterContext<InterpreterFrom<typeof authMachine>>('Auth')

export {AuthProvider, useAuth}

export const useAccountInfo = createAuthSelector(
  (state) => state.context.accountInfo,
)
