import {render, screen, userEvent, waitFor} from '../../../test/app-test-utils'
import {OnboardingPage} from '../index'
import * as clientMock from '@mintter/client'

jest.mock('@mintter/client')

function renderProfileInformation() {
  render(<OnboardingPage machine={{initial: 'profileInformation'}} />)
}

describe('<ProfileInformation />', () => {
  test('render Properly', async () => {
    await renderProfileInformation()

    expect(screen.getByText(/Profile Information/i)).toBeInTheDocument()
    waitFor(() => {
      expect(screen.getByTestId('next-button')).toBeDisabled()
    })
  })

  test('should call updateAccount with the form values', async () => {
    renderProfileInformation()
    const profile = {
      alias: 'johndoe',
      email: 'john@doe.com',
      bio: 'John Doe is better than Chuck Norris',
    }

    userEvent.type(screen.getByTestId(/alias-input/i), profile.alias)
    userEvent.type(screen.getByTestId(/email-input/i), profile.email)
    userEvent.type(screen.getByTestId(/bio-input/i), profile.bio)

    await waitFor(() => {
      expect(screen.getByTestId('next-button')).not.toBeDisabled()
    })

    userEvent.click(screen.getByTestId('next-button'))

    await waitFor(() => {
      expect(clientMock.updateAccount).toHaveBeenCalledTimes(1)
    })

    expect(clientMock.updateAccount).toHaveBeenCalledWith(profile)
  })
})
