import { render, screen, waitFor } from '../../../test/app-test-utils';
import { expect } from '@esm-bundle/chai';
import { SecurityPack } from './security-pack';
import { AppProviders } from '../../app-providers';
describe('Onboarding screens', () => {
  it('<SecurityPack />', async () => {
    await render(<SecurityPack prev={() => {}} next={() => {}} />);
    screen.debug(screen.getByText(/next/i));
    expect(document.body.contains(screen.getByText(/Security Pack/i)));
  });
});
