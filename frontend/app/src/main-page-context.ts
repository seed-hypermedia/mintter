import {useSelector} from '@xstate/react'
import {InterpreterFrom} from 'xstate'
import {mainPageMachine} from './main-page-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [MainPageProvider, useMainPage, createMainPageSelector] =
  createInterpreterContext<InterpreterFrom<typeof mainPageMachine>>('MainPage')

export {MainPageProvider, useMainPage}

export function useFiles() {
  let ref = createMainPageSelector((state) => state.context.files)()
  return useSelector(ref, (state) => state.context.data)
}

export const useSidebar = createMainPageSelector((state) => state.context.sidebar)

export function useIsSidebarOpen() {
  let ref = createMainPageSelector((state) => state.context.sidebar)()
  return useSelector(ref, (state) => state.matches('opened'))
}
