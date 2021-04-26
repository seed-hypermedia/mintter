import type * as React from 'react';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3';
}

export default function Heading({
  children,
  className = '',
  as = 'h2',
  ...props
}: HeadingProps) {
  const Elm = as;
  return <Elm {...props}>{children}</Elm>;
}
