import {renderToStringAsync} from 'react-async-ssr'
import {RootProvider} from './app-providers'
import {Root} from './root'

// eslint-disable-next-line
export function render(url: string, context: any) {
  return renderToStringAsync(
    <RootProvider>
      <Root />
    </RootProvider>,
  )
}
