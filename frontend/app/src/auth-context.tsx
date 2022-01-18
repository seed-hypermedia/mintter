import {InterpreterFrom} from 'xstate'
import {createAuthMachine} from './authstate-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [AuthProvider, useAuth, createAuthSelector] =
  createInterpreterContext<InterpreterFrom<ReturnType<typeof createAuthMachine>>>('Auth')

export {AuthProvider, useAuth}

export const useAccountInfo = createAuthSelector((state) => state.context.accountInfo)
