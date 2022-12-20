import {mainMachine} from '@app/main-machine'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'
export type MainService = InterpreterFrom<typeof mainMachine>

var [MainProvider, useMain, createMainSelector] =
  createInterpreterContext<InterpreterFrom<typeof mainMachine>>('Main')

export {MainProvider, useMain}
