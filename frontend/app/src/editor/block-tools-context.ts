import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {InterpreterFrom} from 'xstate'

const [BlockToolsProvider, useBlockTools, createBlockToolsSelector] =
  createInterpreterContext<InterpreterFrom<typeof blockToolsMachine>>(
    'BlockTools',
  )

export {BlockToolsProvider, useBlockTools}

export var useBlockToolsCoords = createBlockToolsSelector((state) =>
  state.context.currentBlock
    ? {
        x: state.context.currentBlock[1]?.x,
        y: state.context.currentBlock[1]?.y,
      }
    : {x: -9999, y: -9999},
)

export var useCurrentBlockToolsId = createBlockToolsSelector(
  (state) => state.context.currentId,
)
