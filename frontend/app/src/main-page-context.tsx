import {useSelector} from '@xstate/react'
import {InterpreterFrom} from 'xstate'
import {createMainPageService} from './main-page-machine'
import {createInterpreterContext} from './utils/machine-utils'
const [MainPageProvider, useMainPage, createMainPageSelector] =
  createInterpreterContext<
    InterpreterFrom<ReturnType<typeof createMainPageService>>
  >('MainPage')

export {MainPageProvider, useMainPage}

export const useLibrary = createMainPageSelector(
  (state) => state.context.library,
)

export function useIsLibraryOpen() {
  let ref = createMainPageSelector((state) => state.context.library)()
  return useSelector(ref, (state) => state.matches('opened'))
}

export let useParams = createMainPageSelector((state) => state.context.params)

export function getRefFromParams(
  type: 'pub' | 'draft',
  docId: string,
  version: string | null,
): string {
  if (type == 'draft') {
    return `draft-${docId}`
  } else if (type == 'pub') {
    return `pub-${docId}-${version}`
  }

  return ''
}

export let useRecents = createMainPageSelector((state) => state.context.recents)
