export default function Input({
  className = '',
  type = 'text',
  ...props
}: React.HTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 focus:outline-none focus:shadow-outline ${className}`}
      type={type}
      {...props}
    />
  )
}
