import {screen, render, userEvent, waitFor} from '../../../test/app-test-utils'
import {OnboardingPage} from '../index'

it('<Welcome />', async () => {
  render(<OnboardingPage />)

  screen.getByText(/Welcome to Mintter/i)

  userEvent.click(screen.getByTestId(/next-button/i))

  await waitFor(() => {
    expect(screen.getByText(/Security Pack/i)).toBeInTheDocument()
  })
})
