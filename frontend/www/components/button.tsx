import {useRouter} from 'next/router'

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  to: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function WelcomeButton({
  children,
  to,
  className = '',
  disabled = false,
  onClick,
  ...props
}: ButtonProps) {
  const router = useRouter()
  return (
    <button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!disabled) {
          if (to) {
            router.push(to)
          }
          if (onClick) {
            onClick(e)
          }
        }
      }}
      className={`px-4 py-2 bg-transparent rounded hover:bg-gray-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
