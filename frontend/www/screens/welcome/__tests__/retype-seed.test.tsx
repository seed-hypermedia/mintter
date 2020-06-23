import {
  render,
  screen,
  userEvent,
  waitForLoadingToFinish,
  fireEvent,
  waitFor,
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

async function renderWelcomeScreen() {
  const route = `/welcome/retype-seed`

  const mnemonicList = ['word-1', 'word-2', 'word-3']

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({}),
  })

  mockRandom.mockReturnValueOnce([0, 1, 2])

  const utils = await render(<RetypeSeed />, {
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

test('Welcome - Retype Seed Screen', async () => {
  await renderWelcomeScreen()

  const input1 = screen.getByLabelText(/1/i)
  const input2 = screen.getByLabelText(/2/i)
  const input3 = screen.getByLabelText(/3/i)

  const nextBtn = screen.getByText(/Next →/i)

  expect(input1).toHaveFocus()

  fireEvent.input(input1, {target: {value: 'w'}})
  // expect(error1).toBeVisible()
  const error1 = await screen.findByTestId('tid-error-word-0')
  expect(nextBtn).toBeDisabled()

  fireEvent.input(input1, {target: {value: 'word-1'}})

  waitFor(() => expect(error1).not.toBeInTheDocument())

  fireEvent.input(input1, {target: {value: 'word-1'}})
  fireEvent.input(input1, {target: {value: 'word-2'}})
  fireEvent.input(input3, {target: {value: 'word-3'}})

  waitFor(() => expect(nextBtn).not.toBeDisabled())
})
