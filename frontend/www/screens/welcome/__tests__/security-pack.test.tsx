import {
  render,
  screen,
  userEvent,
  waitForLoadingToFinish,
} from 'test/app-test-utils'
import {App} from 'shared/app'
import {BrowserRouter as Router} from 'react-router-dom'
import {ThemeProvider} from 'shared/themeContext'
import {ProfileProvider} from 'shared/profileContext'
import {MintterProvider} from 'shared/mintterContext'
import WelcomeProvider from 'shared/welcomeProvider'

async function renderWelcomeScreen() {
  const route = `/welcome/security-pack`

  const utils = await render(<App />, {
    route,
    wrapper: ({children}) => (
      <Router>
        <ThemeProvider>
          <ProfileProvider>
            <MintterProvider>
              <WelcomeProvider value={{state: {progress: 1}}}>
                {children}
              </WelcomeProvider>
            </MintterProvider>
          </ProfileProvider>
        </ThemeProvider>
      </Router>
    ),
  })

  return {
    ...utils,
  }
}

test('Welcome - Security Pack Screen', async () => {
  const {debug} = await renderWelcomeScreen()

  debug()
})
