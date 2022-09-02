import {HoverProvider} from '@app/editor/hover-context'
import {createHoverService} from '@app/editor/hover-machine'
import {MainProvider} from '@app/main-context'
import {createMainPageService} from '@app/main-machine'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {TooltipProvider} from '@components/tooltip'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, useState} from 'react'
import {Toaster} from 'react-hot-toast'
import {useQueryClient} from 'react-query'
import {FindContextProvider} from './editor/find'

type AppProviderProps = {
  initialRoute?: string
}

function AppProvider({children}: PropsWithChildren<AppProviderProps>) {
  const client = useQueryClient()
  const mainService = useInterpret(() => createMainPageService({client}))
  const bookmarksService = useInterpret(() => createBookmarkListMachine(client))
  const hoverService = useInterpret(() => createHoverService())
  const [search, setSearch] = useState('')

  return (
    <MainProvider value={mainService}>
      <HoverProvider value={hoverService}>
        <BookmarksProvider value={bookmarksService}>
          {
            // TODO: @jonas check types on SearchTearmProvider
          }
          <FindContextProvider value={{search, setSearch}}>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="bottom-right" />
          </FindContextProvider>
        </BookmarksProvider>
      </HoverProvider>
    </MainProvider>
  )
}

export default AppProvider
