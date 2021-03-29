import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { BrowserRouter as Router } from 'react-router-dom';

import { Theme } from '@mintter/ui/theme';
import { AppSpinner } from '@components/app-spinner';

import { SidePanelProvider } from './sidepanel';
import { BlockMenuProvider } from './editor/block-plugin/components/blockmenu-context';
import { global } from '@mintter/ui/stitches.config';

export const queryClient = new QueryClient();

const globalStyles = global({
  'html, body': {
    background: 'red',
  },
});

export const AppProviders: React.FC = ({ children }) => {
  return (
    <Theme>
      <Suspense fallback={<AppSpinner isFullScreen />}>
        <QueryClientProvider client={queryClient}>
          <BlockMenuProvider>
            <SidePanelProvider>
              <Router>{children}</Router>
            </SidePanelProvider>
          </BlockMenuProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Suspense>
    </Theme>
  );
};
