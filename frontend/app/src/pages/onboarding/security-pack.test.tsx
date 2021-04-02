import { render, screen } from 'test/app-test-utils';
import { expect } from '@esm-bundle/chai';
import { SecurityPack } from './security-pack';
import clientMock from '@mintter/client';
describe('Onboarding screens', () => {
  it('<SecurityPack />', async () => {
    await render(<SecurityPack />);
    // expect(screen.getByText(/Welcome to Mintter/i));
    // expect(screen.getByText(/Start/i));
  });
});
