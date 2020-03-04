import {
  useContext,
  createContext,
  useState,
  HTMLAttributes,
  ReactNode,
  useEffect,
} from 'react'
import useLocalStorage from '../pages/localstorage'

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
  const [user, updateUser] = useState<User | null>(propUser)

  function setUser(value: Function | User) {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(user) : {...user, ...value}
      // Save state
      updateUser(valueToStore)
      // Save to local storage
      window.localStorage.setItem('MINTTER_USER', JSON.stringify(valueToStore))
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error('User: error setting new value => ', error)
    }
  }

  useEffect(() => {
    if (window) {
      try {
        const data = window.localStorage.getItem('MINTTER_USER')
        setUser(data ? JSON.parse(data) : user)
      } catch (error) {
        console.error('User: error while storing data => ', error)
      }
    }
  }, [])

  return (
    <UserContext.Provider value={{user, setUser}}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextInterface {
  return useContext<UserContextInterface>(UserContext)
}
