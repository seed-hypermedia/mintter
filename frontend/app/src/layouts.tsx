import * as React from 'react';
import { css } from 'emotion';
import { useTheme } from './theme-context';

export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  initial?: string;
  animate?: string;
  exit?: string;
}

export default function Layout({ children, className = '' }: LayoutProps) {
  const { theme } = useTheme();
  return (
    <div
      data-testid="app-layout"
      className={`bg-background fixed w-screen h-screen flex ${theme} ${className}`}
    >
      {children}
    </div>
  );
}

type AppLayoutProps = {
  children: React.ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { theme } = useTheme();
  return (
    <div
      data-testid="app-layout"
      className={`bg-background w-screen h-screen grid grid-flow-row overflow-hidden ${css`
        grid-template-rows: auto 1fr;
      `} ${theme}`}
    >
      {children}
    </div>
  );
}

type PublicLayoutProps = {
  children: React.ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  const { theme } = useTheme();
  return (
    <div
      data-testid="app-layout"
      className={`min-h-screen bg-background ${theme}`}
    >
      {children}
    </div>
  );
}
