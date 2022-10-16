import {StrictMode} from 'react'
import {renderToStringAsync} from 'react-async-ssr'
import {Root} from './root'

// eslint-disable-next-line
export function render(url: string, context: any) {
  return renderToStringAsync(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
}
