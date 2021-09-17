import useDarkMode from 'use-dark-mode'
import {darkTheme, lightTheme} from '../stitches.config'

const theme = {
  light: lightTheme,
  dark: darkTheme,
}

const oppositeTheme = {
  light: theme.dark,
  dark: theme.light,
}

export const useTheme = () => {
  const {value, toggle} = useDarkMode(false, {
    classNameLight: theme.light,
    classNameDark: theme.dark,
  })

  const currentTheme: 'dark' | 'light' = value ? 'dark' : 'light'
  const className = theme[currentTheme]
  const oppositeClassName = oppositeTheme[currentTheme]

  return {
    currentTheme,
    className,
    oppositeClassName,
    toggle,
  }
}
