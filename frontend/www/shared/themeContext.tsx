import {createContext, useState} from 'react'
export type ThemeContextValueType = {
  theme: string
  setTheme?: React.Dispatch<React.SetStateAction<string>>
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
  const [localTheme, setTheme] = useState(value.theme)

  return (
    <ThemeContext.Provider value={{theme: localTheme, setTheme}}>
      {children}
    </ThemeContext.Provider>
  )
}
