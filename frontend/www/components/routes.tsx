import {Route, Redirect} from 'react-router-dom'
import {match as Match} from 'react-router'
import {useProfile} from 'shared/profileContext'
import {useWelcome} from 'shared/welcomeProvider'
import {FullPageSpinner} from 'components/fullPageSpinner'

export function ProgressRoute({children, ...rest}) {
  const {
    state: {progress},
  } = useWelcome()
  console.log(
    '🚀 ~ file: routes.tsx ~ line 10 ~ ProgressRoute ~ progress',
    progress,
  )
  return (
    <Route
      {...rest}
      render={props => {
        return progress ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: `${getPath(props.match)}/welcome`,
            }}
          />
        )
      }}
    />
  )
}

export function PrivateRoute({
  children,
  pathname = '/',
  exact = false,
  ...rest
}) {
  const {isSuccess, data: profile} = useProfile()
  console.log('🚀 ~ file: routes.tsx ~ line 40 ~ profile', profile)
  if (isSuccess) {
    return (
      <Route
        exact={exact}
        {...rest}
        render={({location, match}) =>
          profile ? (
            children
          ) : (
            <Redirect
              to={{
                pathname: `${getPath(match)}/welcome`,
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

export function getPath(match: Match<{}>) {
  return match.path.includes('admin') ? '/admin' : ''
}

export function createPath(match, path: string) {
  if (path.split('')[0] === '/') {
    throw new Error(
      `"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`,
    )
  }
  return `${match.url}${match.url === '/' ? '' : '/'}${path}`
}
