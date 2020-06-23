import {render as rtlRender, screen, waitFor, fireEvent} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {queryCache} from 'react-query'
import {AppProviders} from 'components/app-providers'

jest.mock('shared/mintterClient')

async function render(
  ui,
  {route = '/library/feed', profile, timeout, ...renderOptions} = {},
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
      wrapper: AppProviders,
      ...renderOptions,
    }),
  }
  await waitForLoadingToFinish(timeout)

  return returnValue
}

function waitForLoadingToFinish(timeout = 4900) {
  return waitFor(
    () => {
      if (queryCache.isFetching) {
        throw new Error('The react-query queryCache is still fetching')
      }
      if (
        screen.queryByLabelText(/loading.../i) ||
        screen.queryByText(/loading.../i)
      ) {
        throw new Error('App loading indicators are still running')
      }
    },
    {timeout},
  )
}

export * from '@testing-library/react'
export {userEvent, fireEvent, render, waitForLoadingToFinish}
