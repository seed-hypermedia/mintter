import {MainProvider} from '@app/main-context'
import {mainMachine} from '@app/main-machine'
import {TooltipProvider} from '@components/tooltip'
import {useInterpret} from '@xstate/react'
import {PropsWithChildren, useState} from 'react'
import {Toaster} from 'react-hot-toast'
import {FindContextProvider} from '../editor/find'

type AppProviderProps = {
  initialRoute?: string
}

function AppProvider({children}: PropsWithChildren<AppProviderProps>) {
  const [search, setSearch] = useState('')
  const mainService = useInterpret(() => mainMachine)
  return (
    <MainProvider value={mainService}>
      <FindContextProvider value={{search, setSearch}}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </FindContextProvider>
    </MainProvider>
  )
}

export default AppProvider
