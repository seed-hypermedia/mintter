import {
  render as rtlRender,
  screen,
  RenderOptions as RTLRenderOptions,
} from '@testing-library/react';

import type mintter from '@mintter/api/v2/mintter_pb';

import { buildProfile } from '@utils/generate';

import { AppProviders } from '../app-providers';

function AppWrapper({ children }: any) {
  return (
    <div>
      <AppProviders>{children}</AppProviders>
    </div>
  );
}

export interface RenderOptions extends RTLRenderOptions {
  route?: string;
  timeout?: number;
  wrapper?: any;
  wait?: boolean;
  profile?: mintter.Profile.AsObject;
}

export async function render(
  ui: React.ReactElement,
  options: RenderOptions = {},
) {
  const {
    route = '/',
    // timeout = 4000,
    wrapper = AppWrapper,
    // wait = false,
    ...renderOptions
  } = options;

  let profile = options.profile;
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

  // TODO: add wait check
  return returnValue;
}

export { screen };
