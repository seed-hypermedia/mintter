import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {createInterpreterContext} from '@app/utils/machine-utils'
import {InterpreterFrom} from 'xstate'

const [BlockToolsProvider, useBlockTools, createBlockToolsSelector] =
  createInterpreterContext<InterpreterFrom<typeof blockToolsMachine>>(
    'BlockTools',
  )

export {BlockToolsProvider, useBlockTools}

export var useCurrentBlockToolsId = createBlockToolsSelector(
  (state) => state.context.currentId,
)
