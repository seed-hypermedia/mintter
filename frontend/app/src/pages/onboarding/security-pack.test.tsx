import { screen, waitFor } from '@testing-library/react';
import { expect } from '@esm-bundle/chai';
import { render } from 'test/utils';
import { SecurityPack } from './security-pack';
describe('Onboarding screens', () => {
  it('<SecurityPack />', async () => {
    await render(<SecurityPack prev={() => {}} next={() => {}} />);
    expect(document.body.contains(screen.getByText(/Security Pack/i)));
  });
});
