import {useContext, createContext, HTMLAttributes} from 'react'

import useLocalStorage from '../shared/localstorage'

export interface User {
  alias: string
}

export interface UserProviderProps extends HTMLAttributes<any> {
  user?: User
  setUser?: (user: User) => void
}

interface UserContextInterface {
  user: User
  setUser?: (user?: User) => void
}

export const UserContext = createContext<UserContextInterface>({
  user: {alias: ''},
})

export default function UserProvider({
  user: propUser = {alias: ''},
  children,
}: UserProviderProps) {
  const [user, setUser] = useLocalStorage({
    key: 'MINTTER_USER',
    initialValue: propUser,
  })

  return (
    <UserContext.Provider value={{user, setUser}}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextInterface {
  return useContext<UserContextInterface>(UserContext)
}
