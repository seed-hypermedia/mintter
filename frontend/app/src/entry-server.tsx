import {renderToStringAsync} from 'react-async-ssr'
import {Router} from 'wouter'
import useStaticLocation from 'wouter/static-location'
import {App} from './app'
import {AppProviders} from './app-providers'

/* eslint-disable */
export function render(url: string, context: any) {
  return renderToStringAsync(
    <AppProviders>
      <Router hook={useStaticLocation(url)}>
        <App />
      </Router>
    </AppProviders>,
  )
}
