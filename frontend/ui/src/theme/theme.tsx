import React, {PropsWithChildren} from 'react'
import {globalStyles} from '../stitches.config'
import {useTheme} from './use-theme'

export function Theme({children}: PropsWithChildren<unknown>) {
  globalStyles()
  useTheme()

  return <>{children}</>
}
