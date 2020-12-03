import {screen, act, waitFor, userEvent, render} from 'test/app-test-utils'
import EditProfile from '../edit-profile'
import * as clientMock from 'shared/mintterClient'
import {BrowserRouter as Router} from 'react-router-dom'
import {ProfileProvider} from 'shared/profileContext'
import {buildEditProfile} from 'test/generate'
import {Profile} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/mintterClient')

const currentUser = {
  toObject: () => ({}),
}

beforeEach(() => {
  clientMock.setProfile = jest.fn()
  clientMock.getProfile.mockResolvedValueOnce(currentUser)
})

async function renderWelcomeScreen({
  profile,
}: {profile: Pick<Profile.AsObject, 'bio' | 'email' | 'username'>} = {}) {
  if (profile === undefined) {
    profile = buildEditProfile()
  }

  const utils = await render(<EditProfile />, {
    wrapper: ({children}) => (
      <Router>
        <ProfileProvider>{children}</ProfileProvider>
      </Router>
    ),
    wait: false,
  })

  return {
    ...utils,
    profile,
  }
}

test('Welcome - Edit Profile Screen', async () => {
  // const {nextBtn, data} = await renderWelcomeScreen()
  const {profile} = await renderWelcomeScreen()
  // const bio = screen.getByLabelText(/bio/i)
  await waitFor(() => {
    expect(screen.getByText(/Edit your profile/i)).toBeInTheDocument()
  })

  await act(() =>
    userEvent.type(screen.getByLabelText(/email/i), profile.email[0]),
  )

  expect(await screen.findByTestId('email-error')).toBeInTheDocument()
  expect(
    screen.getByRole('button', {name: /next/i, exact: false}),
  ).toBeDisabled()

  await act(
    async () =>
      await userEvent.type(
        screen.getByLabelText(/email/i),
        profile.email.substr(1),
      ),
  )
  await act(
    async () =>
      await userEvent.type(
        screen.getByLabelText(/username/i),
        profile.username,
      ),
  )
  await act(
    async () =>
      await userEvent.type(screen.getByLabelText(/bio/i), profile.bio),
  )

  expect(
    screen.getByRole('button', {name: /next/i, exact: false}),
  ).not.toBeDisabled()

  await act(
    async () =>
      await userEvent.click(
        screen.getByRole('button', {name: /next/i, exact: false}),
      ),
  )

  await waitFor(() => {
    expect(clientMock.setProfile).toHaveBeenCalledTimes(1)
  })

  await waitFor(() => {
    expect(clientMock.setProfile).toHaveBeenCalledWith(profile)
  })
})
