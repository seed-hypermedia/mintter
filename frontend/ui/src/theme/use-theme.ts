import useDarkMode from 'use-dark-mode'

import {darkTheme} from '../stitches.config'

export const useTheme = () => {
  const {value, toggle} = useDarkMode(false, {
    classNameDark: darkTheme,
  })

  const currentTheme: 'dark' | 'light' = value ? 'dark' : 'light'

  return {
    currentTheme,
    toggle,
  }
}
