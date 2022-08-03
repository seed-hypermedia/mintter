import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {EditorMode} from '@app/editor/plugin-utils'
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

export function useObserveElement(mode: EditorMode, entry?: any) {}
