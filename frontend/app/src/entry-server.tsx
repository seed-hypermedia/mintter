import {renderToStringAsync} from 'react-async-ssr'
import {App} from './app'
import {AppProviders} from './app-providers'

// eslint-disable-next-line
export function render(url: string, context: any) {
  return renderToStringAsync(
    <AppProviders>
      <App />
    </AppProviders>,
  )
}
