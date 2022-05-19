import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../utils/machine-utils'
import {hoverMachine} from './hover-machine'

const [HoverProvider, useHover, createHoverSelector] =
  createInterpreterContext<InterpreterFrom<typeof hoverMachine>>('Hover')

export {HoverProvider, useHover}

export const useHoverBlockId = createHoverSelector(
  (state) => state.context.blockId,
)
