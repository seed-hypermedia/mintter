import * as React from 'react';

type MainColumnProps = {
  children: React.ReactNode;
  className?: string;
};

export function MainColumn({ children, className = '' }: MainColumnProps) {
  return (
    <div className={`mb-12 pt-4 px-4 box-content ${className}`}>{children}</div>
  );
}
