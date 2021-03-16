import * as React from 'react';

import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { AppSpinner } from './app-spinner';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './theme-context';
import { SidePanelProvider } from './sidepanel';

export const queryClient = new QueryClient();

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <React.Suspense fallback={<AppSpinner />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidePanelProvider>
            <Router>{children}</Router>
          </SidePanelProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.Suspense>
  );
}
