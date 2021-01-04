import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AppProviders} from 'components/app-providers'
import {buildProfile} from './generate'

jest.mock('shared/mintter-client')

function AppWrapper({children}) {
  return (
    <div id="__next">
      <AppProviders>{children}</AppProviders>
    </div>
  )
}

async function render(
  ui,
  {
    route = '/',
    timeout = 4000,
    wrapper = AppWrapper,
    wait = true,
    profile,
    ...renderOptions
  } = {},
) {
  const routeConfig =
    typeof route === 'string'
      ? {
          pathname: route,
          state: {},
        }
      : route

  window.history.pushState(routeConfig.state, 'Test page', routeConfig.pathname)

  profile = typeof profile === 'undefined' ? buildProfile() : profile

  const returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
    profile,
  }

  if (wait) {
    await waitForLoadingToFinish(timeout)
  }

  return returnValue
}

const waitForLoadingToFinish = (timeout = 4000) =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    {timeout},
  )

export * from '@testing-library/react'
export {userEvent, fireEvent, render, waitForLoadingToFinish}
