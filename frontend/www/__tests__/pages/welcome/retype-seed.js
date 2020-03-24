import {
  render,
  wait,
  getByTestId,
  queryAllByAttribute,
  cleanup,
} from '@testing-library/react'
import user from '@testing-library/user-event'
import RetypeSeed from '../../../pages/welcome/retype-seed'
import {getRandomElements as mockGetRandomElements} from '../../../shared/utils'
import WelcomeProvider from '../../../shared/welcomeProvider'

jest.mock('../../../shared/utils')

const mnemonicList = 'abcdefghijklmnopqrtvwxyz'.split('')

afterEach(() => {
  cleanup()
})

function renderComponent() {
  mockGetRandomElements.mockReturnValueOnce([0, 1, 2])
  return render(
    <WelcomeProvider value={{state: {mnemonicList}}}>
      <RetypeSeed />
    </WelcomeProvider>,
  )
}

describe('<RetypeSeed />', () => {
  test('should <NextButton /> be disabled by default', async () => {
    // next button should be disabled
    const {getByText} = renderComponent()

    const nextButton = getByText('Next →')
    await wait(() => expect(nextButton).toBeDisabled())
  })

  test('should show input error when value does not match', async () => {
    const {getByLabelText, queryByRole} = renderComponent()
    const firstInput = getByLabelText(/1/i)

    user.type(firstInput, 'no')

    await wait(() => {
      const firstInputError = queryByRole('alert')
      expect(firstInputError).toBeInTheDocument()
    })
  })

  test('should enable <NextButton /> when form is valid', async () => {
    const {getByLabelText, getByText, debug} = renderComponent()

    const nextButton = getByText('Next →')

    const input1 = getByLabelText(/1/i)
    const input2 = getByLabelText(/2/i)
    const input3 = getByLabelText(/3/i)

    // I need the user interaction since I'm checking also if the input is dirty or not to enable the Next button
    user.type(input1, 'a')
    user.type(input2, 'b')
    user.type(input3, 'c')

    await wait(() => {
      expect(nextButton).not.toBeDisabled()
    })
  })
})
