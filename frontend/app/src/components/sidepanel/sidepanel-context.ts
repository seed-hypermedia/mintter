import {createInterpreterContext} from '@app/utils/machine-utils'
import {InterpreterFrom} from 'xstate'
import {createSidepanelMachine} from './sidepanel'

const [SidepanelProvider, useSidepanel, createSidepanelSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createSidepanelMachine>>
  >('Sidepanel')

export {SidepanelProvider, useSidepanel}

export const useIsSidepanelOpen = createSidepanelSelector((state) =>
  state.matches('ready.opened'),
)
