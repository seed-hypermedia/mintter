import React from 'react'
export interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'password'
  name: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
}

// eslint-disable-next-line react/display-name
const Input = React.forwardRef(
  ({className = '', type = 'text', ...props}: InputProps, ref) => (
    <input
      className={`block w-full border border-gray-300 rounded bg-white px-3 py-2 focus:outline-none focus:border-gray-600 ${className}`}
      type={type}
      ref={ref}
      {...props}
    />
  ),
)

export default Input
