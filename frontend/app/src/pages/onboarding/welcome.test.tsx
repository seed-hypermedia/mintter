import { render, screen, waitFor } from '../../../test/app-test-utils';
import { expect } from '@esm-bundle/chai';
import { Welcome } from './welcome';

describe('Onboarding screens', () => {
  it('<Welcome />', async () => {
    await render(<Welcome next={() => {}} prev={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Mintter/i));
      expect(screen.getByText(/Start/i));
    });
  });
});
