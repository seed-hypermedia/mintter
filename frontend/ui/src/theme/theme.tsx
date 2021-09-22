import React, {Fragment} from 'react'
import {globalStyles} from '../stitches.config'
import {useTheme} from './use-theme'

export function Theme({children}: {children: React.ReactNode}) {
  globalStyles()
  useTheme()

  return <Fragment>{children}</Fragment>
}
