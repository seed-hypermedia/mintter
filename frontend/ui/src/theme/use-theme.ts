import useDarkMode from 'use-dark-mode'

import {darkTheme, lightTheme} from '../stitches.config'

export const useTheme = () => {
  const {value, toggle} = useDarkMode(false, {
    classNameLight: lightTheme,
    classNameDark: darkTheme,
  })

  const currentTheme: 'dark' | 'light' = value ? 'dark' : 'light'

  return {
    currentTheme,
    toggle,
  }
}
