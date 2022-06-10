import {createHoverService} from '@app/editor/hover-machine'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../utils/machine-utils'

const [HoverProvider, useHover, createHoverSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createHoverService>>
  >('Hover')

export {HoverProvider, useHover}

export const useHoverBlockId = createHoverSelector(
  (state) => state.context.blockId,
)
