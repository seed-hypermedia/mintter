export interface InputProps extends React.HTMLAttributes<HTMLInputElement> {
  type: 'text' | 'password'
}

export default function Input({
  className = '',
  type = 'text',
  ...props
}: InputProps) {
  return (
    <input
      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 focus:outline-none focus:shadow-outline ${className}`}
      type={type}
      {...props}
    />
  )
}
