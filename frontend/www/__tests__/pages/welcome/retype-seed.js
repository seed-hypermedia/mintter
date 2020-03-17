import {
  render,
  wait,
  getByTestId,
  queryAllByAttribute,
} from '@testing-library/react'
import user from '@testing-library/user-event'
import RetypeSeed from '../../../pages/welcome/retype-seed'
import SeedProvider from '../../../shared/seedContext'
import {getRandom3 as mockGetRandom3} from '../../../shared/utils'

jest.mock('../../../shared/utils')

const seed = 'abcdefghijklmnopqrtvwxyz'.split('')

afterEach(() => {
  jest.clearAllMocks()
})

function Component() {
  return (
    <SeedProvider value={{seed}}>
      <RetypeSeed />
    </SeedProvider>
  )
}

describe('<RetypeSeed />', () => {
  test('should <NextButton /> be disabled by default', async () => {
    mockGetRandom3.mockReturnValueOnce([0, 1, 2])
    // next button should be disabled
    const {getByText} = render(<Component />)

    const nextButton = getByText('Next →')
    await wait(() => expect(nextButton).toBeDisabled())
  })

  test('should show input error when value does not match', async () => {
    mockGetRandom3.mockReturnValueOnce([0, 1, 2])
    const {getByLabelText, queryByText, debug} = render(<Component />)
    const firstInput = getByLabelText(/1/i)

    user.type(firstInput, 'no')

    await wait(() => {
      const firstInputError = queryByText(/this word is not correct/i)
      expect(firstInputError).toBeInTheDocument()
    })
  })

  test('should enable <NextButton /> when form is valid', async () => {
    mockGetRandom3.mockReturnValueOnce([0, 1, 2])
    const {getByLabelText, getByText} = render(<Component />)

    const input1 = getByLabelText(/1/i)
    const input2 = getByLabelText(/2/i)
    const input3 = getByLabelText(/3/i)
    const nextButton = getByText('Next →')

    user.type(input1, 'a')
    user.type(input2, 'b')
    user.type(input3, 'c')

    await wait(() => expect(nextButton).not.toBeDisabled())
  })
})
