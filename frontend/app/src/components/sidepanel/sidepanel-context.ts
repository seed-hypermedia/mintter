import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../../utils/machine-utils'
import {sidepanelMachine} from './sidepanel'

const [SidepanelProvider, useSidepanel, createSidepanelSelector] =
  createInterpreterContext<InterpreterFrom<typeof sidepanelMachine>>('Sidepanel')

export {SidepanelProvider, useSidepanel}

export const useIsSidepanelOpen = createSidepanelSelector((state) => state.matches('enabled.opened'))

export const useAnnotations = createSidepanelSelector((state) => state.context.annotations)
