import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AppProviders} from 'components/app-providers'
import {buildUser} from './generate'

jest.mock('shared/V1mintterClient')

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
    user,
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

  user = typeof user === 'undefined' ? buildUser() : user
  const returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
    user,
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
