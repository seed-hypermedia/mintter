import {createInterpreterContext} from '@app/utils/machine-utils'
import {InterpreterFrom} from 'xstate'
import {sidepanelMachine} from './sidepanel'

const [SidepanelProvider, useSidepanel, createSidepanelSelector] =
  createInterpreterContext<InterpreterFrom<typeof sidepanelMachine>>('Sidepanel')

export {SidepanelProvider, useSidepanel}

export const useIsSidepanelOpen = createSidepanelSelector((state) => state.matches('enabled.opened'))

export const useAnnotations = createSidepanelSelector((state) => state.context.annotations)
