import {render, waitFor, cleanup, fireEvent} from '@testing-library/react'
import user from '@testing-library/user-event'
import EditProfile from '../../../pages/welcome/edit-profile'
import WelcomeProvider from '../../../shared/welcomeProvider'
import ProfileProvider from '../../../shared/profileContext'
import {Profile} from '@mintter/proto/mintter_pb'
import * as nextRouter from 'next/router'

nextRouter.useRouter = jest.fn()
nextRouter.useRouter.mockImplementation(() => ({
  route: '/welcome/edit-profile',
  pathname: '/welcome/edit-profile',
  replace: jest.fn(),
}))

jest.mock('../../../shared/utils')

const mnemonicList = 'abcdefghijklmnopqrtvwxyz'.split('')

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

const mockGetMnemonicList = jest.fn(['a', 'b', 'c'])
const mockSetProfile = jest.fn()
const mockHasProfile = jest.fn()
mockHasProfile.mockReturnValue(false)
const mockClearProfile = jest.fn()
const mockInitProfile = jest.fn()

const mockRpc = {
  genSeed: () => ({
    getMnemonicList: mockGetMnemonicList,
  }),
  initProfile: mockInitProfile,
  getProfile: () =>
    Promise.resolve({
      getProfile: () => new Profile(),
      setProfile: mockSetProfile,
      hasProfile: mockHasProfile,
      clearProfile: mockClearProfile,
    }),
  updateProfile: () =>
    Promise.resolve({
      getProfile: () => new Profile(),
      setProfile: mockSetProfile,
      hasProfile: mockHasProfile,
      clearProfile: mockClearProfile,
    }),
}

function renderComponent() {
  return render(
    <ProfileProvider rpc={mockRpc}>
      <WelcomeProvider value={{state: {mnemonicList}}}>
        <EditProfile />
      </WelcomeProvider>
    </ProfileProvider>,
  )
}

describe('<EditProfile />', () => {
  test('should the next button be disabled by default', async () => {
    const {getByText} = renderComponent()

    const nextButton = getByText(/Next →/i)

    await waitFor(() => expect(nextButton).toBeDisabled())
  })

  test('should show an error when typing a wrong email', async () => {
    const {getByLabelText, getByText, queryByRole} = renderComponent()

    const nextButton = getByText(/Next →/i)

    fireEvent.input(getByLabelText(/email/i), {target: {value: 'wrong-email'}})

    await waitFor(() => expect(queryByRole('alert')).toBeInTheDocument())
  })

  test('should update the profile with all the form data', async () => {
    const {getByLabelText, getByText} = renderComponent()

    const nextButton = getByText(/Next →/i)

    fireEvent.input(getByLabelText(/username/i), {
      target: {value: 'myusername'},
    })
    fireEvent.input(getByLabelText(/email/i), {
      target: {value: 'email@email.com'},
    })
    fireEvent.input(getByLabelText(/bio/i), {target: {value: 'short bio'}})

    // I need the user interaction since I'm checking also if the input is dirty or not to enable the Next button

    await waitFor(() => {
      expect(nextButton).not.toBeDisabled()
    })

    fireEvent.click(nextButton)

    await waitFor(() => expect())
  })
})
