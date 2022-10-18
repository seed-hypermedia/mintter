import {StrictMode} from 'react'

import {Root} from './root'

// eslint-disable-next-line
export function render(url: string, context: any) {
  return (
    <StrictMode>
      <Root />
    </StrictMode>
  )
}
