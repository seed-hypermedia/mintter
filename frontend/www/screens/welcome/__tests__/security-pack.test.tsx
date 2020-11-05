import {screen, userEvent, waitFor, act} from 'test/app-test-utils'
import {render} from '@testing-library/react'
import {BrowserRouter as Router} from 'react-router-dom'
import {ProfileProvider} from 'shared/profileContext'
import {ToastProvider} from 'react-toast-notifications'
import WelcomeProvider from 'shared/welcomeProvider'
import SecurityPack from '../security-pack'
import * as clientMock from 'shared/mintterClient'

jest.mock('shared/mintterClient')

const mnemonicList = ['word-1', 'word-2', 'word-3']

beforeEach(() => {
  clientMock.genSeed.mockResolvedValueOnce({
    getMnemonicList: jest.fn(() => mnemonicList),
  })

  clientMock.getProfile.mockResolvedValueOnce(null)

  clientMock.createProfile = jest.fn()
})

async function renderWelcomeScreen() {
  const route = `/private/welcome/security-pack`
  const utils = await render(<SecurityPack />, {
    route,
    wrapper: ({children}) => (
      <Router>
        <ProfileProvider>
          <WelcomeProvider
            value={{
              state: {progress: 1, aezeedPassphrase: ''},
              dispatch: jest.fn(),
            }}
          >
            <ToastProvider>{children}</ToastProvider>
          </WelcomeProvider>
        </ProfileProvider>
      </Router>
    ),
  })
  const nextBtn = screen.getByText(/Next →/i)

  return {
    ...utils,
    nextBtn,
    mnemonicList,
  }
}

test('Welcome - Security Pack Screen', async () => {
  const {nextBtn, mnemonicList} = await renderWelcomeScreen()

  await act(async () => {
    expect(clientMock.genSeed).toBeCalledTimes(1)
  })
  expect(screen.getByText(/word-2/i)).toBeInTheDocument()
  expect(nextBtn).toBeInTheDocument()
  expect(nextBtn).not.toBeDisabled()
  await act(async () => await userEvent.click(nextBtn))
  await waitFor(() => {
    expect(clientMock.createProfile).toHaveBeenCalledTimes(1)
  })
  await waitFor(() => {
    expect(clientMock.createProfile).toHaveBeenCalledWith({
      walletPassword: '',
      aezeedPassphrase: '',
      mnemonicList,
    })
  })
})
