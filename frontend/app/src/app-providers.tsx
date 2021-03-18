import * as React from 'react';

import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { AppSpinner } from './app-spinner';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './theme-context';
import { SidePanelProvider } from './sidepanel';
import { BlockMenuProvider } from './editor/block-plugin/components/blockmenu-context';
import * as stitches from '@mintter/ui/stitches.config';
console.log('stitches -', stitches);

export const queryClient = new QueryClient();

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <React.Suspense fallback={<AppSpinner />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BlockMenuProvider>
            <SidePanelProvider>
              <Router>{children}</Router>
            </SidePanelProvider>
          </BlockMenuProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.Suspense>
  );
}
