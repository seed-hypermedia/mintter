import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AppProviders} from 'components/app-providers'

jest.mock('shared/V1mintterClient')

function AppWrapper({children}) {
  return (
    <div id="#__next">
      <AppProviders>{children}</AppProviders>
    </div>
  )
}

async function render(
  ui,
  {
    route = '/library/feed',
    timeout,
    wrapper = AppWrapper,
    ...renderOptions
  } = {},
) {
  const routeConfig =
    typeof route === 'string'
      ? {
          pathname: route,
          state: {},
        }
      : {
          ...route,
        }

  window.history.pushState(routeConfig.state, 'Test page', routeConfig.pathname)

  const returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
  }
  await waitForLoadingToFinish(timeout)

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
