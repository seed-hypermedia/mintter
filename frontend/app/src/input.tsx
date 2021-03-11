import * as React from 'react';
export interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'password' | 'email';
  name: string;
  error?: boolean;
  disabled?: boolean;
}

// TODO: fix types
// eslint-disable-next-line react/display-name
export const Input = React.forwardRef(
  (
    {
      className = '',
      type = 'text',
      disabled = false,
      error = false,
      ...props
    }: InputProps,
    ref,
  ) => (
    <input
      className={`block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body${
        error ? ' border-danger' : ''
      } ${disabled ? ' opacity-75' : ''} ${className}`}
      type={type}
      ref={ref as any}
      disabled={disabled}
      {...props}
    />
  ),
);

export default Input;
