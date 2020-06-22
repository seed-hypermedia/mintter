import {
  render,
  screen,
  userEvent,
  waitForLoadingToFinish,
  fireEvent,
} from 'test/app-test-utils'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import WelcomeProvider from 'shared/welcomeProvider'
import SecurityPack from '../security-pack'
import {GenSeedResponse, Profile} from '@mintter/proto/mintter_pb'
import * as clientMock from 'shared/mintterClient'

jest.mock('shared/mintterClient')

async function renderWelcomeScreen() {
  const route = `/welcome/security-pack`

  clientMock.genSeed.mockResolvedValueOnce({
    getMnemonicList: jest.fn(() => ['word-1', 'word-2', 'word-3']),
  })

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({}),
  })

  const utils = await render(<SecurityPack />, {route, timeout: 6000})

  return {
    ...utils,
  }
}

test('Welcome - Security Pack Screen', async () => {
  const {getByText, debug} = await renderWelcomeScreen()

  expect(getByText(/Security Pack/i)).toBeInTheDocument()
  expect(getByText(/word-2/i)).toBeInTheDocument()
  expect(clientMock.genSeed).toBeCalledTimes(1)

  const nextBtn = getByText(/Next/i)

  expect(nextBtn).toBeInTheDocument()
  expect(nextBtn).not.toBeDisabled()
})
