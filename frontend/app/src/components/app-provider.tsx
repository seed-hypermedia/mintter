import {MainProvider} from '@app/main-context'
import {mainMachine} from '@app/main-machine'
import {TooltipProvider} from '@components/tooltip'
import {invoke} from '@tauri-apps/api'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, useState} from 'react'
import {useLocation} from 'wouter'
import {FindContextProvider} from '../editor/find'

type AppProviderProps = {
  initialRoute?: string
}

function AppProvider({children}: PropsWithChildren<AppProviderProps>) {
  const [search, setSearch] = useState('')
  const [, setLocation] = useLocation()
  const mainService = useInterpret(() => mainMachine, {
    actions: {
      refetchDraftList: () => {
        invoke('emit_all', {
          event: 'new_draft',
        })
      },
      navigateToDraft: (c, event) => {
        setLocation(`/d/${event.data.id}`)
      },
    },
  })
  return (
    <MainProvider value={mainService}>
      <FindContextProvider value={{search, setSearch}}>
        <TooltipProvider>{children}</TooltipProvider>
      </FindContextProvider>
    </MainProvider>
  )
}

export default AppProvider
