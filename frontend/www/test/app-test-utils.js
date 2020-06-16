import {render as rtlRender, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {queryCache} from 'react-query'
import {AppProviders} from 'components/app-providers'

jest.mock('shared/mintterClient')

async function render(
  ui,
  {route = '/library/feed', profile, ...renderOptions} = {},
) {
  window.history.pushState({}, 'Test page', route)

  const returnValue = {
    ...rtlRender(ui, {
      wrapper: AppProviders,
      ...renderOptions,
    }),
  }
  await waitForLoadingToFinish()

  return returnValue
}

function waitForLoadingToFinish() {
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
    {timeout: 4000},
  )
}

export * from '@testing-library/react'
export {userEvent, render, waitForLoadingToFinish}
