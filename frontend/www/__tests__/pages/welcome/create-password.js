// should <NextButton /> be disabled
// should form be valid if passwords match
import {
  render,
  waitFor,
  cleanup,
  waitForElementToBeRemoved,
  queryAllByRole,
  fireEvent,
} from '@testing-library/react'
import user from '@testing-library/user-event'
import CreatePassword from '../../../pages/welcome/create-password'
import WelcomeProvider from '../../../shared/welcomeProvider'
import ProfileProvider from '../../../shared/profileContext'
import {Profile} from '@mintter/proto/mintter_pb'
import {RouterContext} from 'next-server/dist/lib/router-context'
import * as nextRouter from 'next/router'

nextRouter.useRouter = jest.fn()
nextRouter.useRouter.mockImplementation(() => ({
  route: '/welcome/create-password',
  pathname: '/welcome/create-password',
}))

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

const mockGetMnemonicList = jest.fn(['a', 'b', 'c'])
const mockSetProfile = jest.fn()
const mockHasProfile = jest.fn(true)
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
      <WelcomeProvider
        value={{
          state: {mnemonicList: ['a', 'b', 'c'], aezeedPassphrase: 'abc'},
        }}
      >
        <CreatePassword />
      </WelcomeProvider>
    </ProfileProvider>,
  )
}

function wait(time) {
  return new Promise(function(resolve) {
    setTimeout(() => resolve(), time)
  })
}

describe('<CreatePassword />', () => {
  test("should submit and generate the user's mnemonicList", async () => {
    const {
      queryByTestId,
      queryByText,
      queryAllByRole,
      debug,
    } = renderComponent()
    const fakepassword = 'demopassword'

    const nextButton = queryByText(/Next →/i)

    await waitFor(() => expect(nextButton).toBeDisabled())

    const input1 = queryByTestId('first')
    const input2 = queryByTestId('second')

    user.type(input1, fakepassword)
    user.type(input2, fakepassword)

    await waitFor(() => expect(nextButton).not.toBeDisabled())

    user.click(nextButton)

    // TODO: test if the method is being called
    await waitFor(() => expect(mockInitProfile).toHaveBeenCalledTimes(1))
  })
})
