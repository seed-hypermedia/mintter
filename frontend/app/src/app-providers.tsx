import { Suspense, FC } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { BrowserRouter as Router } from 'react-router-dom';

import { Theme } from '@mintter/ui/theme';
import { AppSpinner } from '@components/app-spinner';

import { SidePanelProvider } from './sidepanel';

export const queryClient = new QueryClient();

export const AppProviders: FC = ({ children }) => {
  return (
    <Theme>
      <Suspense fallback={<AppSpinner isFullScreen />}>
        <QueryClientProvider client={queryClient}>
          <SidePanelProvider>
            <Router>{children}</Router>
          </SidePanelProvider>
          <Toaster position="bottom-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Suspense>
    </Theme>
  );
};
