import { render } from 'test/utils';
import { waitFor, screen } from '@testing-library/react';
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
