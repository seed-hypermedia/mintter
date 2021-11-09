import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from '../../utils/machine-utils'
import {sidebarMachine} from './sidebar-machine'

const [SidebarProvider, useSidebar, createSidebarSelector] =
  createInterpreterContext<InterpreterFrom<typeof sidebarMachine>>('Sidepanel')

export {SidebarProvider, useSidebar}

export const useIsSidebarOpen = createSidebarSelector((state) => state.matches('opened'))
