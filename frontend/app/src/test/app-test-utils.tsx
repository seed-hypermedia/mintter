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

function AppWrapper({children}: {children: React.ReactNode}) {
  return (
    <div>
      <AppProviders>{children}</AppProviders>
    </div>
  )
}

export type RenderOptions = RTLRenderOptions & {
  route?: string
  timeout?: number
  wrapper?: any
  account?: Account
}

export type RenderResult = RTLRenderResults & {
  account: Account
}

async function render(
  ui: any,
  {route = '/', timeout = 4000, wrapper = AppWrapper, wait = false, account, ...renderOptions}: RenderOptions = {},
): RenderResult {
  const routeConfig =
    typeof route === 'string'
      ? {
          pathname: route,
          state: {},
        }
      : route

  window.history.pushState(routeConfig.state, 'Test page', routeConfig.pathname)

  account ||= mocks.mockAccount()

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
