import {screen, userEvent, waitFor, act} from 'test/app-test-utils'
import {render} from '@testing-library/react'
import EditProfile from '../edit-profile'
import * as clientMock from 'shared/mintterClient'
import {BrowserRouter as Router} from 'react-router-dom'
import {ProfileProvider} from 'shared/profileContext'

jest.mock('shared/mintterClient')

const currentUser = {
  toObject: () => ({}),
}

const bio = 'test bio'

beforeEach(() => {
  clientMock.setProfile = jest.fn()
  clientMock.getProfile.mockResolvedValueOnce(currentUser)
})

async function renderWelcomeScreen() {
  const route = `/welcome/edit-profile`
  const utils = await render(
    <Router>
      <ProfileProvider>
        <EditProfile />
      </ProfileProvider>
    </Router>,

    {route},
  )
  const nextBtn = screen.getByText(/Next →/i)

  return {
    ...utils,
    nextBtn,
    data: {
      username: 'testusername',
      email: 'email@test.com',
      bio,
    },
  }
}

test('Welcome - Edit Profile Screen', async () => {
  const {nextBtn, data} = await renderWelcomeScreen()

  const username = screen.getByLabelText(/username/i)
  const email = screen.getByLabelText(/email/i)
  const bio = screen.getByLabelText(/bio/i)

  await waitFor(() => {
    expect(username).toHaveFocus()
  })

  userEvent.type(email, 'e')
  const emailError = await screen.findByTestId('email-error')

  expect(emailError).toBeInTheDocument()
  expect(nextBtn).toBeDisabled()

  await act(() => userEvent.type(email, data.email.substr(1)))
  await act(() => userEvent.type(username, data.username))
  await act(() => userEvent.type(bio, data.bio))
  expect(nextBtn).not.toBeDisabled()

  await act(async () => await userEvent.click(nextBtn))

  await waitFor(() => {
    expect(clientMock.setProfile).toHaveBeenCalledTimes(1)
  })

  await waitFor(() => {
    expect(clientMock.setProfile).toHaveBeenCalledWith(data)
  })
})
