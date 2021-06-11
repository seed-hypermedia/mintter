import './matchmedia-mock'
import {
  render as rtlRender,
  RenderOptions as RTLRenderOptions,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mock, Profile} from '@mintter/client'
import {AppProviders} from '../app-providers'

function AppWrapper({children}: {children: React.ReactNode}) {
  return (
    <div>
      <AppProviders>{children}</AppProviders>
    </div>
  )
}

type RenderOptions = RTLRenderOptions & {
  route?: string
  timeout?: number
  wrapper?: any
  profile?: Profile
}

async function render(
  ui: any,
  {
    route = '/',
    timeout = 4000,
    wrapper = AppWrapper,
    // wait = true,
    profile,
    ...renderOptions
  }: RenderOptions = {},
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

  const returnValue = {
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

const waitForLoadingToFinish = (timeout: number) =>
  waitForElementToBeRemoved(
    () => [...screen.queryAllByLabelText(/loading spinner/i), ...screen.queryAllByText(/loading/i)],
    {timeout},
  )

export * from '@testing-library/react'
export {userEvent, fireEvent, render, waitForLoadingToFinish}
