import {InterpreterFrom} from 'xstate'
import {createAuthService} from './auth-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [AuthProvider, useAuth, createAuthSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createAuthService>>
  >('Auth')

export {AuthProvider, useAuth}

export const useAccountInfo = createAuthSelector(
  (state) => state.context.accountInfo,
)
