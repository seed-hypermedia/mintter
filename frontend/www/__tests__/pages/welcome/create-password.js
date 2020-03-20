// should <NextButton /> be disabled
// should form be valid if passwords match
import {render, wait, fireEvent} from '@testing-library/react'
import CreatePassword from '../../../pages/welcome/create-password'
import WelcomeProvider from '../../../shared/welcomeProvider'
import {RpcProvider} from '../../../shared/rpc'

describe('<CreatePassword />', () => {
  test('should <NextButton /> be disabled', async () => {
    const {getByText} = render(<CreatePassword />)
    const nextButton = getByText(/Next →/i)

    await wait(() => expect(nextButton).toBeDisabled())
  })

  test("should submit and generate the user's seed", async () => {
    const mockInitProfile = jest.fn(() => console.log('hola'))
    const {getAllByLabelText, getByText} = render(
      <RpcProvider value={{initProfile: mockInitProfile}}>
        <WelcomeProvider
          value={{state: {seed: ['a', 'b', 'c'], passphrase: 'abc'}}}
        >
          <CreatePassword />
        </WelcomeProvider>
      </RpcProvider>,
    )
    const fakepassword = 'demopassword'

    const inputs = getAllByLabelText(/Password/i)
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
