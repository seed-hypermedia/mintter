import {screen, userEvent, waitFor, act} from 'test/app-test-utils'
import {render} from '@testing-library/react'
import {BrowserRouter as Router} from 'react-router-dom'
import {ProfileProvider} from 'shared/profile-context'
import {ToastProvider} from 'react-toast-notifications'
import WelcomeProvider from 'shared/welcome-provider'
import * as clientMock from 'shared/mintter-client'
import SecurityPack from '../security-pack'

jest.mock('shared/mintterClient')

const mnemonicList = ['word-1', 'word-2', 'word-3']

beforeEach(() => {
  clientMock.genSeed.mockResolvedValueOnce({
    getMnemonicList: jest.fn(() => mnemonicList),
  })

  clientMock.createProfile = jest.fn()
})

async function renderWelcomeScreen({
  mnemonicList,
  ...renderOptions
}: {
  mnemonicList: string[]
} = {}) {
  if (mnemonicList === undefined) {
    mnemonicList = ['word-1', 'word-2', 'word-3']
  }

  clientMock.genSeed.mockResolvedValueOnce({
    getMnemonicList: jest.fn(() => mnemonicList),
  })

  const route = '/welcome/security-pack'

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
    ...renderOptions,
  })
  const nextBtn = screen.getByText(/Next →/i)

  return {
    ...utils,
    route,
    nextBtn,
    mnemonicList,
  }
}

test('Welcome - Security Pack Screen', async () => {
  const {nextBtn, mnemonicList} = await renderWelcomeScreen()
  await waitFor(() => {
    expect(clientMock.genSeed).toBeCalledTimes(1)
  })

  expect(screen.getByText(/word-2/i)).toBeInTheDocument()
  expect(nextBtn).toBeInTheDocument()
  expect(nextBtn).not.toBeDisabled()
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
