import {Add, Button, XStack} from '@shm/ui'
import {createContext, PropsWithChildren, useContext, useMemo} from 'react'

export type CurrentAccountContext = {
  id: string
} | null

const currentAccountContext = createContext<CurrentAccountContext>(null)

export function CurrentAccountContextProvider({
  value,
  children,
}: PropsWithChildren<{value?: CurrentAccountContext}>) {
  const _value = useMemo(() => {
    if (value) return value
    return null
  }, [value])
  return (
    <currentAccountContext.Provider value={_value}>
      {children}
    </currentAccountContext.Provider>
  )
}

export function useCurrentAccount() {
  let context = useContext(currentAccountContext)

  if (context !== null || typeof context !== 'object') {
    throw new Error('useAccountContext must be used within an AccountProvider')
  }

  return context
}

export function CurrentAccountSidebarSection() {
  const context = useCurrentAccount()

  console.log(`== ~ CurrentAccountSidebarSection ~ context:`, context)

  if (context === null) {
    return (
      <XStack bg="red">
        <Button icon={Add} chromeless borderRadius={0} f={1}>
          Add Account
        </Button>
      </XStack>
    )
  }
}
