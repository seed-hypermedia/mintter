import {createContext, useCallback, useContext, useState} from 'react'

export enum SidebarStatus {
  Open,
  Close,
}

const SidebarContext = createContext({status: SidebarStatus.Open, toggle: () => {}, open: () => {}, close: () => {}})

export function SidebarProvider({children}: {children: ReactNode}) {
  const [status, setStatus] = useState(SidebarStatus.Open)
  const toggle = useCallback(function toggleCallback() {
    setStatus((v) => (v == SidebarStatus.Close ? SidebarStatus.Open : SidebarStatus.Close))
  }, [])
  const open = useCallback(function openCallback() {
    setStatus(SidebarStatus.Open)
  }, [])
  const close = useCallback(function closeCallback() {
    setStatus(SidebarStatus.Close)
  }, [])

  return <SidebarContext.Provider value={{status, toggle, open, close}}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  return useContext(SidebarContext)
}
