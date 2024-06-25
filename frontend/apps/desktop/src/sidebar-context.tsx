import { StateStream, writeableStateStream } from '@shm/shared'
import { PropsWithChildren, createContext, useContext, useMemo } from 'react'
import { useNavigationDispatch, useNavigationState } from './utils/navigation'

type SidebarContextValue = {
  onMenuHover: () => void
  onMenuHoverDelayed: () => void
  onMenuHoverLeave: () => void
  onToggleMenuLock: () => void
  onLockSidebarOpen: () => void
  onCloseSidebar: () => void
  isHoverVisible: StateStream<boolean>
  isLocked: StateStream<boolean>
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export const SidebarWidth = 300

export function SidebarContextProvider(props: PropsWithChildren<{}>) {
  const state = useNavigationState()
  const dispatch = useNavigationDispatch()
  return (
    <SidebarContext.Provider
      value={useMemo(() => {
        const [setIsHoverVisible, isHoverVisible] =
          writeableStateStream<boolean>(false)
        const [setIsLocked, isLocked] = writeableStateStream<boolean>(
          state.sidebarLocked || false,
        )
        let closeTimeout: null | NodeJS.Timeout = null
        let hoverOpenTimeout: null | NodeJS.Timeout = null
        function onMenuHover() {
          closeTimeout && clearTimeout(closeTimeout)
          setIsHoverVisible(true)
        }
        function onMenuHoverDelayed() {
          closeTimeout && clearTimeout(closeTimeout)
          hoverOpenTimeout && clearTimeout(hoverOpenTimeout)
          hoverOpenTimeout = setTimeout(() => {
            hoverOpenTimeout && clearTimeout(hoverOpenTimeout)
            closeTimeout && clearTimeout(closeTimeout)
            setIsHoverVisible(true)
          }, 300)
        }
        function onMenuHoverLeave() {
          hoverOpenTimeout && clearTimeout(hoverOpenTimeout)
          closeTimeout = setTimeout(() => {
            setIsHoverVisible(false)
          }, 250)
        }
        function onToggleMenuLock() {
          const wasLocked = isLocked.get()
          const nextIsLocked = !wasLocked
          dispatch({ type: 'sidebarLocked', value: nextIsLocked })
          setIsLocked(nextIsLocked)
        }
        function onLockSidebarOpen() {
          dispatch({ type: 'sidebarLocked', value: true })
          setIsLocked(true)
        }
        function onCloseSidebar() {
          dispatch({ type: 'sidebarLocked', value: false })
          setIsLocked(false)
          setIsHoverVisible(false)
        }
        return {
          isHoverVisible,
          isLocked,
          onMenuHover,
          onMenuHoverDelayed,
          onMenuHoverLeave,
          onToggleMenuLock,
          onLockSidebarOpen,
          onCloseSidebar,
        }
      }, [])}
    >
      {props.children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const ctx = useContext(SidebarContext)
  if (!ctx)
    throw new Error(
      'useSidebarContext must be used within SidebarContextProvider',
    )
  return ctx
}
