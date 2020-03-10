import {useRouter} from 'next/router'

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  to?: string
  type?: 'button' | 'submit'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function WelcomeButton({
  children,
  to,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const router = useRouter()
  return (
    <button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!disabled) {
          if (onClick) {
            onClick(e)
          }

          if (to) {
            router.push(to)
          }
        }
      }}
      className={`px-4 py-2 bg-transparent rounded hover:bg-gray-200 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
