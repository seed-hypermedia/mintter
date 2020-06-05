import {render, waitFor, cleanup, fireEvent} from '@testing-library/react'
import user from '@testing-library/user-event'
import RetypeSeed from 'pages/welcome/retype-seed'
import {getRandomElements as mockGetRandomElements} from 'shared/utils'
import WelcomeProvider from 'shared/welcomeProvider'
import ProfileProvider from 'shared/profileContext'
import {Profile} from '@mintter/proto/mintter_pb'
import * as nextRouter from 'next/router'

nextRouter.useRouter = jest.fn()
nextRouter.useRouter.mockImplementation(() => ({
  route: '/welcome/retype-seed',
  pathname: '/welcome/retype-seed',
  replace: jest.fn(),
}))

jest.mock('shared/utils')

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
  mockGetRandomElements.mockReturnValueOnce([0, 1, 2])
  return render(
    <ProfileProvider rpc={mockRpc}>
      <WelcomeProvider value={{state: {mnemonicList}}}>
        <RetypeSeed />
      </WelcomeProvider>
    </ProfileProvider>,
  )
}

describe('<RetypeSeed />', () => {
  test('should focus the first input on enter', async () => {
    const {getByLabelText} = renderComponent()

    await waitFor(() =>
      expect(getByLabelText(/1/i)).toEqual(document.activeElement),
    )
  })
  test('should show input error when value does not match', async () => {
    const {getByLabelText, queryByRole, getByText} = renderComponent()

    const nextButton = getByText(/Next →/i)
    fireEvent.input(getByLabelText(/1/i), {target: {value: 'no'}})

    await waitFor(() => expect(nextButton).toBeDisabled())

    await waitFor(() => expect(queryByRole('alert')).toBeInTheDocument())
  })

  test('should enable <NextButton /> when form is valid', async () => {
    const {getByLabelText, getByText, debug} = renderComponent()

    const nextButton = getByText(/Next →/i)

    // await waitFor(() => expect(nextButton).toBeDisabled())

    fireEvent.input(getByLabelText(/1/i), {target: {value: 'a'}})
    fireEvent.input(getByLabelText(/2/i), {target: {value: 'b'}})
    fireEvent.input(getByLabelText(/3/i), {target: {value: 'c'}})

    // I need the user interaction since I'm checking also if the input is dirty or not to enable the Next button

    await waitFor(() => {
      expect(nextButton).not.toBeDisabled()
    })
  })
})
