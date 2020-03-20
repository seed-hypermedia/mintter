import {createContext, useState, useContext} from 'react'
import useLocalStorage from './localstorage'
export type ThemeContextValueType = {
  theme: string
  toggleTheme?: () => void
}

const initialValue: ThemeContextValueType = {
  theme: 'theme-light',
}

export const ThemeContext = createContext<ThemeContextValueType>(initialValue)

export interface ThemeProviderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: ThemeContextValueType
}

export function ThemeProvider({
  children,
  value = initialValue,
}: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<string>({
    key: 'MINTTER_THEME',
    initialValue: 'theme-light',
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
