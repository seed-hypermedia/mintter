import {render, screen, userEvent, waitFor} from '../../../test/app-test-utils'
import {OnboardingPage} from '../index'
import * as clientMock from '@mintter/client'

jest.mock('@mintter/client')

async function renderProfileInformation() {
  return await render(<OnboardingPage machine={{initial: 'profileInformation'}} />, {wait: false})
}

describe('<ProfileInformation />', () => {
  test('render Properly', async () => {
    await renderProfileInformation()
    await waitFor(() => {
      expect(screen.getByText(/Profile Information/i)).toBeInTheDocument()
    })
  })

  test('should call updateAccount with the form values', async () => {
    await renderProfileInformation()
    const profile = {
      alias: 'johndoe',
      email: 'john@doe.com',
      bio: 'John Doe is better than Chuck Norris',
    }
    const next = screen.queryByTestId('next-button')

    await waitFor(() => {
      expect(next).toBeInTheDocument()
    })

    userEvent.type(screen.getByTestId(/alias-input/i), profile.alias)
    userEvent.type(screen.getByTestId(/email-input/i), profile.email)
    userEvent.type(screen.getByTestId(/bio-input/i), profile.bio)

    await waitFor(() => {
      expect(next).not.toBeDisabled()
    })

    userEvent.click(next)

    await waitFor(() => {
      expect(clientMock.updateAccount).toHaveBeenCalledTimes(1)
    })

    expect(clientMock.updateAccount).toHaveBeenCalledWith(profile)
  })
})
