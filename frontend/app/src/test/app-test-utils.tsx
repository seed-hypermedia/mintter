import {
  render as rtlRender,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '../app-providers';
import { buildProfile } from '@utils/generate';

// jest.mock('../src/mintter-client.ts');

function AppWrapper({ children }: any) {
  return (
    <div>
      <AppProviders>{children}</AppProviders>
    </div>
  );
}

async function render(
  ui: any,
  {
    route = '/',
    timeout = 4000,
    wrapper = AppWrapper,
    wait = false,
    profile,
    ...renderOptions
  } = {} as any,
) {
  const routeConfig =
    typeof route === 'string'
      ? {
          pathname: route,
          state: {},
        }
      : route;

  window.history.pushState(
    routeConfig.state,
    'Test page',
    routeConfig.pathname,
  );

  if (typeof profile === 'undefined') {
    profile = buildProfile();
  }

  const returnValue = {
    ...rtlRender(ui, {
      wrapper,
      ...renderOptions,
    }),
    profile,
  };

  if (wait) {
    await waitForLoadingToFinish(timeout);
  }

  return returnValue;
}

const waitForLoadingToFinish = (timeout = 4000) =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    { timeout },
  );

export * from '@testing-library/react';
export { userEvent, fireEvent, render, waitForLoadingToFinish };
