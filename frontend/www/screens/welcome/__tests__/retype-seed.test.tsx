import {render, screen, userEvent, waitFor, act} from 'test/app-test-utils'
import {BrowserRouter as Router} from 'react-router-dom'
import {ProfileProvider} from 'shared/profile-context'
import WelcomeProvider from 'shared/welcome-provider'
import RetypeSeed from '../retype-seed'
import * as clientMock from 'shared/mintter-client'
import {getRandomElements as mockRandom} from 'shared/utils'

jest.mock('shared/mintter-client')
jest.mock('shared/utils')

async function renderWelcomeScreen() {
  const mnemonicList = ['word-1', 'word-2', 'word-3']

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: () => ({}),
  })

  clientMock.createProfile = jest.fn()

  mockRandom.mockReturnValueOnce([0, 1, 2])

  const utils = await render(<RetypeSeed />, {
    wrapper: ({children}) => (
      <Router>
        <ProfileProvider>
          <WelcomeProvider
            value={{
              state: {mnemonicList, progress: 1, aezeedPassphrase: ''},
              dispatch: jest.fn(),
            }}
          >
            {children}
          </WelcomeProvider>
        </ProfileProvider>
      </Router>
    ),
    wait: false,
  })

  const nextBtn = screen.getByText(/Next →/i)

  return {
    ...utils,
    nextBtn,
    mnemonicList,
  }
}

test('Welcome - Retype Seed Screen', async () => {
  const {nextBtn, mnemonicList} = await renderWelcomeScreen()

  const input1 = screen.getByLabelText(/1/i)
  const input2 = screen.getByLabelText(/2/i)
  const input3 = screen.getByLabelText(/3/i)

  await waitFor(() => {
    expect(input1).toHaveFocus()
  })

  userEvent.type(input1, 'w')
  const error1 = await screen.findByTestId('tid-error-word-0')

  expect(error1).toBeInTheDocument()
  expect(nextBtn).toBeDisabled()

  userEvent.type(input1, 'ord-1')
  userEvent.type(input2, 'word-2')
  userEvent.type(input3, 'word-3')

  await waitFor(() => {
    expect(nextBtn).not.toBeDisabled()
  })

  userEvent.click(nextBtn)

  await waitFor(() => {
    expect(clientMock.createProfile).toHaveBeenCalledTimes(1)
  })

  expect(clientMock.createProfile).toHaveBeenCalledWith({
    walletPassword: '',
    aezeedPassphrase: '',
    mnemonicList,
  })
})
