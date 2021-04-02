import * as React from 'react';
import { render, screen } from 'test/app-test-utils';
import { expect } from 'chai';
import { Welcome } from './welcome';

describe('Onboarding screens', () => {
  it('<Welcome />', async () => {
    await render(<Welcome />);

    expect(screen.getByText(/Welcome to Mintter/i));
    expect(screen.getByText(/Start/i));
  });
});
