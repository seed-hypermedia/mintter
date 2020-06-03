import {createContext, useContext, useCallback, useMemo, ReactNode} from 'react'
import useLocalStorage from './localstorage'

export enum THEME {
  LIGHT,
  DARK,
}

export type ThemeContextValueType = {
  theme: THEME
  toggleTheme?: () => void
}

const initialValue: ThemeContextValueType = {
  theme: THEME.LIGHT,
}

export const ThemeContext = createContext<ThemeContextValueType>(initialValue)

export interface ThemeProviderProps {
  children: ReactNode
  theme?: THEME
  toggleTheme?: () => void
}

export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<THEME>({
    key: 'MINTTER_THEME',
    initialValue: props.theme || THEME.LIGHT,
  })

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme =>
      prevTheme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT,
    )
  }, [setTheme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value} {...props} />
}

export function useTheme() {
  const context = useContext<ThemeContextValueType>(ThemeContext)
  if (context === undefined) {
    throw new Error(`useTheme must be used within a ThemeProvider`)
  }

  return context
}
