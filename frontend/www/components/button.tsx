import {useRouter} from 'next/router'

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  to?: string
  type?: 'button' | 'submit'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  replace?: boolean
}

export default function WelcomeButton({
  children,
  to,
  className = '',
  disabled = false,
  replace = false,
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
            replace ? router.replace(to) : router.push(to)
          }
        }
      }}
      className={`px-4 py-2 bg-transparent rounded hover:bg-gray-200 ${className}`}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
