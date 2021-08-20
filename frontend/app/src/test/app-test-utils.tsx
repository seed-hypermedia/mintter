import './matchmedia-mock'
import {
  render as rtlRender,
  RenderOptions as RTLRenderOptions,
  RenderResult as RTLRenderResults,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {Account, Profile} from '@mintter/client'
import * as mocks from '@mintter/client/mocks'
import {AppProviders} from '../app-providers'
import {MemoryRouter} from 'react-router-dom'
import {App} from '../app'
function createWrapper(route: string) {
  return function AppWrapper({children}: {children: React.ReactNode}) {
    return (
      <AppProviders>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </AppProviders>
    )
  }
}

export type RenderOptions = RTLRenderOptions & {
  wait?: boolean
  route?: string
  timeout?: number
  wrapper?: any
  account?: Account
}

export type RenderResult = RTLRenderResults & {
  account: Account
}

async function render(
  ui: any = <App />,
  {route = '/', timeout = 4000, wrapper, wait = true, account, ...renderOptions}: RenderOptions = {},
): Promise<RenderResult> {
  const routeConfig =
    typeof route === 'string'
      ? {
          pathname: route,
          state: {},
        }
      : route

  window.history.pushState(routeConfig.state, 'Test page', routeConfig.pathname)

  account ||= mocks.mockAccount()
  wrapper ||= createWrapper(route)

  const returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
    account,
  }

  if (wait) {
    await waitForLoadingToFinish(timeout)
  }

  return returnValue
}

const waitForLoadingToFinish = (timeout: number) =>
  waitForElementToBeRemoved(
    () => [...screen.queryAllByLabelText(/loading spinner/i), ...screen.queryAllByText(/loading/i)],
    {timeout},
  )

export * from '@testing-library/react'
export {userEvent, fireEvent, render, waitForLoadingToFinish}
