import { Welcome } from './welcome';
import { screen, render } from '@testing-library/react'
import { AppProviders } from '../../app-providers';

it('<Welcome />', async () => {

  render(<AppProviders><Welcome next={() => { }} prev={() => { }} /></AppProviders>)

  screen.getByText(/Welcome to Mintter/i)
  screen.getByTestId(/next-button/i)

});
