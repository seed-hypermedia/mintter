import {Route, Redirect, useLocation} from 'react-router-dom'
import {useProfile} from 'shared/profileContext'
import {useWelcome} from 'shared/welcomeProvider'
import {FullPageSpinner} from 'components/fullPageSpinner'

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
              pathname: '/private/welcome',
            }}
          />
        )
      }
    />
  )
}

export function PrivateRoute({children, ...rest}) {
  const {status, data: profile} = useProfile()

  if (status === 'success') {
    return (
      <Route
        {...rest}
        render={({location}) =>
          profile ? (
            children
          ) : (
            <Redirect
              to={{
                pathname: '/private/welcome',
                state: {from: location},
              }}
            />
          )
        }
      />
    )
  } else {
    return <FullPageSpinner />
  }
}
