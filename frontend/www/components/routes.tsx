import {Route, Redirect, useLocation} from 'react-router-dom'
import {useProfile} from 'shared/profileContext'
import {useWelcome} from 'shared/welcomeProvider'

export function ProgressRoute({children, ...rest}) {
  const {
    state: {progress},
  } = useWelcome()
  return (
    <Route
      {...rest}
      render={() =>
        progress ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/welcome',
            }}
          />
        )
      }
    />
  )
}

export function PrivateRoute({children, ...rest}) {
  const {data: profile} = useProfile()
  // debugger
  return (
    <Route
      {...rest}
      render={({location}) =>
        profile ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/welcome',
              state: {from: location},
            }}
          />
        )
      }
    />
  )
}
