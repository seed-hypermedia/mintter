import * as React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useProfile } from './mintter-hooks';
import { useWelcome } from './welcome-provider';
import { AppSpinner } from '@components/app-spinner';
import { getPath } from '@utils/routes';

type ProgressRouteProps = {
  children: React.ReactNode;
  path: string;
};

export function ProgressRoute({ children, ...rest }: ProgressRouteProps) {
  const {
    state: { progress },
  } = useWelcome();
  const { data, isLoading } = useProfile();

  if (isLoading) {
    return <AppSpinner />;
  }

  return (
    <Route
      {...rest}
      render={(props) => {
        return progress ? (
          children
        ) : data ? (
          <Redirect
            to={{
              pathname: `${getPath(props.match)}/library`,
            }}
          />
        ) : (
          <Redirect
            to={{
              pathname: `${getPath(props.match)}/welcome`,
            }}
          />
        );
      }}
    />
  );
}
