// should <NextButton /> be disabled
// should form be valid if passwords match
import {render, waitFor, cleanup, act} from '@testing-library/react'
import user from '@testing-library/user-event'
import CreatePassword from '../../../pages/welcome/create-password'
import WelcomeProvider from '../../../shared/welcomeProvider'
import {RpcProvider} from '../../../shared/rpc'
import ProfileProvider from '../../../shared/profileContext'
import {Profile} from '@mintter/proto/mintter_pb'

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
    <RpcProvider value={mockRpc}>
      <ProfileProvider>
        <WelcomeProvider
          value={{
            state: {mnemonicList: ['a', 'b', 'c'], aezeedPassphrase: 'abc'},
          }}
        >
          <CreatePassword />
        </WelcomeProvider>
      </ProfileProvider>
    </RpcProvider>,
  )
}

describe('<CreatePassword />', () => {
  xtest("should submit and generate the user's mnemonicList", async () => {
    const {queryByTestId, queryByText, debug} = renderComponent()
    const fakepassword = 'demopassword'

    queryByTestId(/first/i).value = fakepassword
    queryByTestId(/second/i).value = fakepassword

    // user.type(inputs[0], fakepassword)
    // user.type(inputs[1], fakepassword)

    const nextButton = queryByText(/Next →/i)
    debug(nextButton)

    await waitFor(() => expect(nextButton).not.toBeDisabled())
    user.click(nextButton)

    await waitFor(() => expect(nextButton).toBeDisabled())

    // TODO: test if the method is being called
    expect(mockInitProfile).toBeCalledTimes(1)
  })
})
