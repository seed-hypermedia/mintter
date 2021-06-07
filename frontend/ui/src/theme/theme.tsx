import { Fragment } from 'react'

import { globalStyles } from '../stitches.config'
import { useTheme } from './use-theme'

export type ThemeProps = React.ComponentProps<typeof Theme>

export const Theme: React.FC = ({ children }) => {
  globalStyles()
  useTheme()

  return <Fragment>{children}</Fragment>
}
