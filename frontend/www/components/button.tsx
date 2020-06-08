import {useHistory} from 'react-router-dom'

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  to?: string
  type?: 'button' | 'submit'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  replace?: boolean
}

export default function Button({
  children,
  to,
  className = '',
  disabled = false,
  replace = false,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const history = useHistory()
  return (
    <button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (!disabled) {
          if (onClick) {
            onClick(e)
          }

          if (to) {
            replace ? history.replace(to) : history.push(to)
          }
        }
      }}
      className={`px-4 py-2 bg-transparent rounded transition duration-200 hover:bg-muted ${className}`}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
