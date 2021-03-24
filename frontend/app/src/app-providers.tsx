import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { BrowserRouter as Router } from 'react-router-dom';

import { Theme } from '@mintter/ui/theme';
import { AppSpinner } from '@components/app-spinner';

import { SidePanelProvider } from './sidepanel';
import { BlockMenuProvider } from './editor/block-plugin/components/blockmenu-context';

export const queryClient = new QueryClient();

export const AppProviders: React.FC = ({ children }) => {
  return (
    <Suspense fallback={<AppSpinner />}>
      <QueryClientProvider client={queryClient}>
        <Theme>
          <BlockMenuProvider>
            <SidePanelProvider>
              <Router>{children}</Router>
            </SidePanelProvider>
          </BlockMenuProvider>
        </Theme>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Suspense>
  );
};
