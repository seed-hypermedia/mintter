import {StateStream, writeableStateStream} from '@mintter/shared'
import {PropsWithChildren, createContext, useContext, useMemo} from 'react'
import {client} from '@mintter/desktop/src/trpc'
import {useNavigationDispatch, useNavigationState} from '../utils/navigation'

type SidebarContextValue = {
  onMenuHover: () => void
  onMenuHoverLeave: () => void
  onToggleMenuLock: () => void
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
        function onMenuHover() {
          closeTimeout && clearTimeout(closeTimeout)
          setIsHoverVisible(true)
        }
        function onMenuHoverLeave() {
          closeTimeout = setTimeout(() => {
            setIsHoverVisible(false)
          }, 300)
        }
        function onToggleMenuLock() {
          const wasLocked = isLocked.get()
          const nextIsLocked = !wasLocked
          dispatch({type: 'sidebarLocked', value: nextIsLocked})
          setIsLocked(nextIsLocked)
        }
        return {
          isHoverVisible,
          isLocked,
          onMenuHover,
          onMenuHoverLeave,
          onToggleMenuLock,
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
