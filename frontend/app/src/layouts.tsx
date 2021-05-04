import type { HTMLAttributes, ReactNode } from 'react';

import { Box } from '@mintter/ui/box';

// import { useTheme } from './theme-context';

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  initial?: string;
  animate?: string;
  exit?: string;
}

export default function Layout({
  children /* , className = '' */,
}: LayoutProps) {
  // const { theme } = useTheme();
  return <Box data-testid="app-layout">{children}</Box>;
}

type AppLayoutProps = {
  children: ReactNode;
};

// TODO:
export function AppLayout({ children }: AppLayoutProps) {
  // const { theme } = useTheme();
  return <Box data-testid="app-layout">{children}</Box>;
}

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  // const { theme } = useTheme();
  return <Box data-testid="app-layout">{children}</Box>;
}
