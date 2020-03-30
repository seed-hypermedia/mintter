import {createContext, useContext} from 'react'
import useLocalStorage from './localstorage'
import ThemeToggle from '../components/themeToggle'

export type ThemeContextValueType = {
  theme: string
  toggleTheme?: () => void
}

const initialValue: ThemeContextValueType = {
  theme: 'theme-light',
}

export const ThemeContext = createContext<ThemeContextValueType>(initialValue)

export interface ThemeProviderProps {
  children: React.ReactNode
  value?: string
}

export function ThemeProvider({
  children,
  value = 'theme-light',
}: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<string>({
    key: 'MINTTER_THEME',
    initialValue: value,
  })

  function toggleTheme() {
    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light')
  }

  return (
    <ThemeContext.Provider value={{theme, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext<ThemeContextValueType>(ThemeContext)
}
