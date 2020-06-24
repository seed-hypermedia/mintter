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
import {GenSeedResponse, Profile} from '@mintter/proto/mintter_pb'
import * as clientMock from 'shared/mintterClient'
import {ProfileProvider} from 'shared/profileContext'

jest.mock('shared/mintterClient')

async function renderWelcomeScreen({onSubmit}) {
  const route = `/welcome/create-password`

  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({}),
  })

  clientMock.createProfile = jest.fn()

  const utils = await render(<CreatePassword onSubmit={onSubmit} />, {
    route,
    wrapper: ({children}) => (
      <Router>
        <ProfileProvider>
          <WelcomeProvider
            value={{
              state: {
                mnemonicList: ['word-1', 'word-2', 'word-3'],
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
  }
}

test('Welcome - Create Password Screen', async () => {
  const submitMock = jest.fn()
  const pwrd = 'masterpassword'
  const {nextBtn} = await renderWelcomeScreen({onSubmit: submitMock})

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
    expect(submitMock).toHaveBeenCalledTimes(1)
  })

  await waitFor(() => {
    expect(submitMock).toHaveBeenCalledWith({
      walletPassword: pwrd,
    })
  })
})
