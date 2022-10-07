import {MainProvider} from '@app/main-context'
import {createMainPageService} from '@app/main-machine'
import {
  BookmarksProvider,
  createBookmarkListMachine,
} from '@components/bookmarks'
import {TooltipProvider} from '@components/tooltip'
import {useQueryClient} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, useState} from 'react'
import {Toaster} from 'react-hot-toast'
import {FindContextProvider} from './editor/find'

type AppProviderProps = {
  initialRoute?: string
}

function AppProvider({children}: PropsWithChildren<AppProviderProps>) {
  const client = useQueryClient()
  const mainService = useInterpret(() => createMainPageService({client}))
  const bookmarksService = useInterpret(() => createBookmarkListMachine(client))

  const [search, setSearch] = useState('')

  return (
    <MainProvider value={mainService}>
      <BookmarksProvider value={bookmarksService}>
        {
          // TODO: @jonas check types on SearchTearmProvider
        }
        <FindContextProvider value={{search, setSearch}}>
          <TooltipProvider>{children}</TooltipProvider>
          <ReactQueryDevtools />
          <Toaster position="bottom-right" />
        </FindContextProvider>
      </BookmarksProvider>
    </MainProvider>
  )
}

export default AppProvider
