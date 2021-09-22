import {renderToStringAsync} from 'react-async-ssr'
import {StaticRouter} from 'react-router-dom'
import {App} from './app'
import {AppProviders} from './app-providers'

export function render(url: string, context: any) {
  return renderToStringAsync(
    <AppProviders>
      <StaticRouter location={url} context={context}>
        <App />
      </StaticRouter>
    </AppProviders>,
  )
}
