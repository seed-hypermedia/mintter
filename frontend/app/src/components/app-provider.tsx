import {TooltipProvider} from '@components/tooltip'
import {PropsWithChildren, useState} from 'react'
import {FindContextProvider} from '../editor/find'

type AppProviderProps = {
  initialRoute?: string
}

function AppProvider({children}: PropsWithChildren<AppProviderProps>) {
  const [search, setSearch] = useState('')
  return (
    <FindContextProvider value={{search, setSearch}}>
      <TooltipProvider>{children}</TooltipProvider>
    </FindContextProvider>
  )
}

export default AppProvider
