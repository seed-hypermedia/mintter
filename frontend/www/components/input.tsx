import React from 'react'
export interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'password' | 'email'
  name: string
  error?: boolean
  disabled?: boolean

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
}

// eslint-disable-next-line react/display-name
const Input = React.forwardRef(
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
      className={`block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body ${error &&
        'border-danger'} ${disabled && 'opacity-75'} ${className}`}
      type={type}
      ref={ref}
      disabled={disabled}
      {...props}
    />
  ),
)

export default Input
