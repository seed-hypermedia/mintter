import {Route, Redirect} from 'react-router-dom'
import {useProfile} from 'shared/profileContext'

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
