import {StrictMode} from 'react'
import {renderToStringAsync} from 'react-async-ssr'
import {Root, RootProvider} from './root'

// eslint-disable-next-line
export function render(url: string, context: any) {
  return renderToStringAsync(
    <StrictMode>
      <RootProvider>
        <Root />
      </RootProvider>
    </StrictMode>,
  )
}
