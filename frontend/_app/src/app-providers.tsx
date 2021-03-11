import * as React from 'react';

import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { AppSpinner } from './app-spinner';
import { BrowserRouter as Router } from 'react-router-dom';

export const queryClient = new QueryClient();

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <React.Suspense fallback={<AppSpinner />}>
      <QueryClientProvider client={queryClient}>
        <Router>{children}</Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.Suspense>
  );
}
