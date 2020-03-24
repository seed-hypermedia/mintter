// should <NextButton /> be disabled
// should form be valid if passwords match
import {render, wait, fireEvent, cleanup} from '@testing-library/react'
import CreatePassword from '../../../pages/welcome/create-password'
import WelcomeProvider from '../../../shared/welcomeProvider'
import {RpcProvider} from '../../../shared/rpc'
import ProfileProvider from '../../../shared/profileContext'

afterEach(() => {
  cleanup()
})

function renderComponent() {
  return render(
    <RpcProvider
      value={{
        getProfile: () => ({getProfile: jest.fn()}),
        initProfile: jest.fn(),
      }}
    >
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
  test('should <NextButton /> be disabled', async () => {
    const {getByText} = renderComponent()

    const nextButton = getByText(/Next →/i)

    await wait(() => expect(nextButton).toBeDisabled())
  })

  test("should submit and generate the user's mnemonicList", async () => {
    const {
      getAllByLabelText,
      queryAllByLabelText,
      getByText,
    } = renderComponent()
    const fakepassword = 'demopassword'

    const inputs = queryAllByLabelText(/Password/i)
    inputs[0].value = fakepassword
    inputs[1].value = fakepassword
    const nextButton = getByText(/Next →/i)

    await wait(expect(nextButton).not.toBeDisabled())

    fireEvent.click(nextButton)

    expect(nextButton).toBeDisabled()

    // TODO: test if the method is being called
    // expect(mockInitProfile).toBeCalledTimes(1)
  })
})
