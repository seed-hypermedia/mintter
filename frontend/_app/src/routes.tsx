import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';
import type { match as Match } from 'react-router';
import { useProfile } from './use-profile';
// import { useWelcome } from 'shared/welcome-provider';
import { AppSpinner } from './app-spinner';
import { ADMIN_ROUTE } from './constants';

// type ProgressRouteProps = {
//   children: React.ReactNode;
// };
// export function ProgressRoute({ children, ...rest }: ProgressRouteProps) {
//   const {
//     state: { progress },
//   } = useWelcome();
//   const { data, isLoading } = useProfile();
//   console.log(
//     '🚀 ~ file: routes.tsx ~ line 15 ~ ProgressRoute ~ data, isLoading',
//     data,
//     isLoading,
//   );

//   if (isLoading) {
//     return <AppSpinner />;
//   }

//   return (
//     <Route
//       {...rest}
//       render={(props) => {
//         return progress ? (
//           children
//         ) : data ? (
//           <Redirect
//             to={{
//               pathname: `${getPath(props.match)}/library`,
//             }}
//           />
//         ) : (
//           <Redirect
//             to={{
//               pathname: `${getPath(props.match)}/welcome`,
//             }}
//           />
//         );
//       }}
//     />
//   );
// }

export function PrivateRoute({ children, exact = false, ...rest }: RouteProps) {
  const { isSuccess, data: profile } = useProfile();
  if (isSuccess) {
    return (
      <Route
        exact={exact}
        {...rest}
        render={({ location, match }) =>
          profile ? (
            children
          ) : (
            <Redirect
              to={{
                pathname: `${getPath(match)}/welcome`,
                state: { from: location },
              }}
            />
          )
        }
      />
    );
  } else {
    return <AppSpinner />;
  }
}

export function getPath(match: Match<{}>) {
  return match.path.includes(ADMIN_ROUTE) ? `/${ADMIN_ROUTE}` : '';
}

export function createPath(match: Match<{}>, path: string) {
  if (path.split('')[0] === '/') {
    throw new Error(
      `"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`,
    );
  }
  return `${match.url}${match.url === '/' ? '' : '/'}${path}`;
}
