import {createContext, useContext, useCallback} from 'react'
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
  value?: 'theme-light' | 'theme-dark'
}

export function ThemeProvider({
  children,
  value = 'theme-light',
}: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<string>({
    key: 'MINTTER_THEME',
    initialValue: value,
  })

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light')
  }, [theme])

  return (
    <ThemeContext.Provider value={{theme, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext<ThemeContextValueType>(ThemeContext)
  if (context === undefined) {
    throw new Error(`useTheme must be used within a ThemeProvider`)
  }

  return context
}
