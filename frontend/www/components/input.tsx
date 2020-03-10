import React from 'react'
export interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type: 'text' | 'password'
  name: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any
}

// eslint-disable-next-line react/display-name
const Input = React.forwardRef(
  ({className = '', type = 'text', ...props}: InputProps, ref) => (
    <input
      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 focus:outline-none focus:shadow-outline ${className}`}
      type={type}
      ref={ref}
      {...props}
    />
  ),
)

export default Input
