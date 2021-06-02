import { forwardRef } from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, children, ...props }, ref) => {
    return (
      <RouterLink to={to} {...props} ref={ref}>
        {children}
      </RouterLink>
    );
  },
);
