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
import WelcomeProvider from 'shared/welcomeProvider'
import CreatePassword from '../create-password'
import {GenSeedResponse, Profile} from '@mintter/api/v2/mintter_pb'
import * as clientMock from 'shared/V1mintterClient'
import {ProfileProvider} from 'shared/profileContext'

jest.mock('shared/V1mintterClient')

async function renderWelcomeScreen() {
  const route = `/private/welcome/create-password`

  const mnemonicList = ['word-1', 'word-2', 'word-3']

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({}),
  })

  clientMock.createProfile = jest.fn()

  const utils = await render(<CreatePassword />, {
    route,
    wrapper: ({children}) => (
      <Router>
        <ProfileProvider>
          <WelcomeProvider
            value={{
              state: {
                mnemonicList,
                aezeedPassphrase: '',
                progress: 1,
              },
              dispatch: jest.fn(),
            }}
          >
            {children}
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

test('Welcome - Create Password Screen', async () => {
  const pwrd = 'masterpassword'
  const {nextBtn, mnemonicList} = await renderWelcomeScreen()

  const input1 = screen.getByTestId(/tid-input-password1/i)
  const input2 = screen.getByTestId(/tid-input-password2/i)

  await waitFor(() => {
    expect(input1).toHaveFocus()
  })

  await act(() => userEvent.type(input1, 'm'))

  const error1 = await screen.findByTestId(/tid-error-password1/i)

  expect(error1).toBeInTheDocument()
  expect(nextBtn).toBeDisabled()

  await act(() => userEvent.type(input1, 'asterpassword'))
  await act(() => userEvent.type(input2, pwrd))

  expect(nextBtn).not.toBeDisabled()

  await act(async () => await userEvent.click(nextBtn))

  await waitFor(() => {
    expect(clientMock.createProfile).toHaveBeenCalledTimes(1)
  })

  await waitFor(() => {
    expect(clientMock.createProfile).toHaveBeenCalledWith({
      walletPassword: pwrd,
      mnemonicList,
      aezeedPassphrase: '',
    })
  })
})
