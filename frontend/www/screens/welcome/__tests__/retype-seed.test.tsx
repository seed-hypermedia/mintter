import {
  render,
  screen,
  userEvent,
  waitForLoadingToFinish,
  fireEvent,
  waitFor,
  act,
  waitForElement,
} from 'test/app-test-utils'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import WelcomeProvider from 'shared/welcomeProvider'
import RetypeSeed from '../retype-seed'
import {GenSeedResponse, Profile} from '@mintter/proto/mintter_pb'
import * as clientMock from 'shared/mintterClient'
import {getRandomElements as mockRandom} from 'shared/utils'

jest.mock('shared/mintterClient')
jest.mock('shared/utils')

async function renderWelcomeScreen({onSubmit}) {
  const route = `/welcome/retype-seed`

  const mnemonicList = ['word-1', 'word-2', 'word-3']

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({}),
  })

  mockRandom.mockReturnValueOnce([0, 1, 2])

  const utils = await render(<RetypeSeed onSubmit={onSubmit} />, {
    route,
    timeout: 6000,
    wrapper: ({children}) => (
      <Router>
        <WelcomeProvider
          value={{
            state: {mnemonicList, progress: 1},
            dispatch: jest.fn(),
          }}
        >
          {children}
        </WelcomeProvider>
      </Router>
    ),
  })

  return {
    ...utils,
  }
}

const onSubmit = jest.fn()

test('Welcome - Retype Seed Screen', async () => {
  const submitMock = jest.fn()
  await renderWelcomeScreen({onSubmit: submitMock})

  const input1 = screen.getByLabelText(/1/i)
  const input2 = screen.getByLabelText(/2/i)
  const input3 = screen.getByLabelText(/3/i)

  const nextBtn = screen.getByText(/Next →/i)

  expect(input1).toHaveFocus()

  await act(() => userEvent.type(input1, 'w'))
  const error1 = await screen.findByTestId('tid-error-word-0')

  expect(error1).toBeInTheDocument()
  expect(nextBtn).toBeDisabled()

  await act(() => userEvent.type(input1, 'ord-1'))
  await act(() => userEvent.type(input2, 'word-2'))
  await act(() => userEvent.type(input3, 'word-3'))

  expect(nextBtn).not.toBeDisabled()

  userEvent.click(nextBtn)

  waitFor(() => {
    expect(submitMock).toHaveBeenCalledTimes(1)
  })
})
