import * as React from 'react';
import { render, screen } from 'test/app-test-utils';
import { expect } from 'chai';
import { SecurityPack } from './security-pack';

describe('Onboarding screens', () => {
  it('<SecurityPack />', async () => {
    await render(<SecurityPack />);

    screen.debug();
    // expect(screen.getByText(/Welcome to Mintter/i));
    // expect(screen.getByText(/Start/i));
  });
});
