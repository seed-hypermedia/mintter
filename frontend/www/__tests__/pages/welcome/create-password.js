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

function renderComponent() {
  return render(
    <RpcProvider>
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
  xtest('should <NextButton /> be disabled', async () => {
    const {queryByText} = renderComponent()

    const nextButton = queryByText(/Next →/i)

    await waitFor(() => expect(nextButton).toBeDisabled())
  })

  xtest("should submit and generate the user's mnemonicList", async () => {
    const {queryAllByLabelText, getByText, queryByText} = renderComponent()
    const fakepassword = 'demopassword'

    const inputs = await queryAllByLabelText(/Password/i)

    user.type(inputs[0], fakepassword)
    user.type(inputs[1], fakepassword)

    await act(async () => {
      const nextButton = await queryByText(/Next →/i)

      await waitFor(() => expect(nextButton).not.toBeDisabled())
    })

    user.click(nextButton)

    expect(nextButton).toBeDisabled()

    // TODO: test if the method is being called
    // expect(mockInitProfile).toBeCalledTimes(1)
  })
})
