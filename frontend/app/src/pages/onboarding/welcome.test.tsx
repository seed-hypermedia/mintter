import { expect } from '@esm-bundle/chai';
import { waitFor, screen } from '@testing-library/react';

import { render } from 'test/utils';

import { Welcome } from './welcome';

describe('Onboarding screens', () => {
  it('<Welcome />', async () => {
    await render(
      <Welcome
        next={() => {
          return;
        }}
        prev={() => {
          return;
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Mintter/i));
      expect(screen.getByText(/Start/i));
    });
  });
});
