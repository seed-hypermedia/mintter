import * as React from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';

export function Link({ to, children, ...props }: LinkProps) {
  return (
    <RouterLink to={to} {...props}>
      {children}
    </RouterLink>
  );
}
