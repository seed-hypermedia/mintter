import {Route, Redirect} from 'react-router-dom'
import {useProfile} from 'shared/profileContext'

export function PublicRoute({children, ...rest}) {
  const {profile} = useProfile()
  return (
    <Route
      {...rest}
      render={({location}) =>
        !profile ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/library/publications',
              state: {from: location},
            }}
          />
        )
      }
    />
  )
}

export function PrivateRoute({children, ...rest}) {
  const {profile} = useProfile()
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
