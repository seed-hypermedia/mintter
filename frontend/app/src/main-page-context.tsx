import {useSelector} from '@xstate/react'
import {InterpreterFrom} from 'xstate'
import {createMainPageMachine} from './main-page-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [MainPageProvider, useMainPage, createMainPageSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createMainPageMachine>>
  >('MainPage')

export {MainPageProvider, useMainPage}

export function useFiles() {
  let ref = createMainPageSelector((state) => state.context.files)()
  return useSelector(ref, (state) => state.context.data)
}

export let useFilesService = createMainPageSelector(
  (state) => state.context.files,
)

export function useDrafts() {
  let ref = createMainPageSelector((state) => state.context.drafts)()
  return useSelector(ref, (state) => state.context.data)
}

export let useDraftsService = createMainPageSelector(
  (state) => state.context.drafts,
)

export const useLibrary = createMainPageSelector(
  (state) => state.context.library,
)

export function useIsLibraryOpen() {
  let ref = createMainPageSelector((state) => state.context.library)()
  return useSelector(ref, (state) => state.matches('opened'))
}

export let useParams = createMainPageSelector((state) => state.context.params)

export let useRecents = createMainPageSelector((state) => state.context.recents)
