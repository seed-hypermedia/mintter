import './matchmedia-mock'
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mock} from '@mintter/client'
import {AppProviders} from '../app-providers'

function AppWrapper({children}) {
  return (
    <div>
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
    // wait = true,
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

  profile = profile ?? mock.mockProfile()

  let returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
    profile,
  }

  // if (wait) {
  //   await waitForLoadingToFinish(timeout)
  // }

  return returnValue
}

const waitForLoadingToFinish = timeout =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading spinner/i),
      ...screen.queryAllByText(/loading/i),
    ],
    {timeout},
  )

export * from '@testing-library/react'
export {userEvent, fireEvent, render, waitForLoadingToFinish}
