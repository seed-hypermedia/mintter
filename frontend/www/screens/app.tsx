import {AppProviders} from 'components/app-providers'
import {
  Switch,
  Route,
  Link,
  Redirect,
  useHistory,
  useLocation,
} from 'react-router-dom'
import {useAsync} from 'shared/useAsync'
import {useLayoutEffect} from 'react'
import {bootstrapAppData} from 'shared/appBootstrap'
import {FullPageErrorMessage} from 'components/errorMessage'
import {Library} from './library'
import {Welcome} from './welcome'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export function App(props) {
  const {
    isLoading,
    isIdle,
    status,
    error,
    isError,
    data,
    setData,
    run,
  } = useAsync()

  useLayoutEffect(() => {
    run(bootstrapAppData())
  }, [])

  if (isLoading || isIdle) {
    return <p>LOADING...</p>
  }

  if (isError) {
    return <FullPageErrorMessage error={error} />
  }

  console.log('data => ', data)
  return (
    <AppProviders>
      <div>
        <AuthButton />

        <ul className="flex items-center">
          <li className="mx-2 p-2">
            <Link to="/public">Public Page</Link>
          </li>
          <li className="mx-2 p-2">
            <Link to="/protected">Protected Page</Link>
          </li>
        </ul>

        <Switch>
          <Route path="/public">
            <PublicPage />
          </Route>
          <Route path="/login">
            <LoginPage />
          </Route>
          <PrivateRoute path="/protected">
            <ProtectedPage />
          </PrivateRoute>
        </Switch>
      </div>
    </AppProviders>
  )
}

const fakeAuth = {
  isAuthenticated: false,
  authenticate(cb) {
    fakeAuth.isAuthenticated = true
    setTimeout(cb, 100) // fake async
  },
  signout(cb) {
    fakeAuth.isAuthenticated = false
    setTimeout(cb, 100)
  },
}

function AuthButton() {
  let history = useHistory()

  return fakeAuth.isAuthenticated ? (
    <p>
      Welcome!{' '}
      <button
        onClick={() => {
          fakeAuth.signout(() => history.push('/'))
        }}
      >
        Sign out
      </button>
    </p>
  ) : (
    <p>You are not logged in.</p>
  )
}

function PrivateRoute({children, ...rest}) {
  return (
    <Route
      {...rest}
      render={({location}) =>
        fakeAuth.isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: {from: location},
            }}
          />
        )
      }
    />
  )
}

function PublicPage() {
  return <h3>Public</h3>
}

function ProtectedPage() {
  return <h3>Protected</h3>
}

function LoginPage() {
  let history = useHistory()
  let location = useLocation()

  let {from} = location.state || {from: {pathname: '/'}}
  let login = () => {
    fakeAuth.authenticate(() => {
      history.replace(from)
    })
  }

  return (
    <div>
      <p>You must log in to view the page at {from.pathname}</p>
      <button onClick={login}>Log in</button>
    </div>
  )
}
