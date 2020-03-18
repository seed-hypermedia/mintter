// should <NextButton /> be disabled
// should form be valid if passwords match
import {render, wait, fireEvent} from '@testing-library/react'
import user from '@testing-library/user-event'
import CreatePassword from '../../../pages/welcome/create-password'
import next from 'next'

describe('<CreatePassword />', () => {
  test('should <NextButton /> be disabled', async () => {
    const {getByText} = render(<CreatePassword />)
    const nextButton = getByText(/Next →/i)

    await wait(() => expect(nextButton).toBeDisabled())
  })

  test('should form be valid if passwords match', async () => {
    const {getAllByLabelText, getByText} = render(<CreatePassword />)
    const fakepassword = 'demopassword'

    const inputs = getAllByLabelText(/Password/i)
    inputs[0].value = fakepassword
    inputs[1].value = fakepassword
    // getByTestId(/pass2/i).value = fakepassword
    const nextButton = getByText(/Next →/i)
    // fireEvent.click(nextButton)

    await wait(expect(nextButton).not.toBeDisabled())
  })
})
