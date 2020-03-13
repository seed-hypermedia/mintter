import {useContext, createContext, HTMLAttributes} from 'react'

import useLocalStorage from '../shared/localstorage'

export interface User {
  alias: string
  password?: string
}

export interface PartialUser {
  alias?: string
  password?: string
}

export interface UserProviderProps extends HTMLAttributes<any> {
  user?: User
  setUser?: (user: User) => void
}

interface UserContextInterface {
  user: User
  setUser?: (user: PartialUser | Function) => void
}

export const UserContext = createContext<UserContextInterface>({
  user: {alias: ''},
})

export default function UserProvider({
  user: propUser = {alias: ''},
  children,
}: UserProviderProps) {
  const [user, originalSetUser] = useLocalStorage({
    key: 'MINTTER_USER',
    initialValue: propUser,
  })

  function setUser(partial_user: PartialUser) {
    const newUser: User = {
      ...user,
      ...partial_user,
    }

    originalSetUser(newUser)
  }

  return (
    <UserContext.Provider value={{user, setUser}}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextInterface {
  return useContext<UserContextInterface>(UserContext)
}
