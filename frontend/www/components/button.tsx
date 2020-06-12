import {useHistory} from 'react-router-dom'

export interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  replace?: boolean
  ref?: any
}

export interface ButtonLinkProps extends ButtonProps {
  to?: string
}

export default function LinkButton({
  children,
  to,
  className = '',
  disabled = false,
  replace = false,
  type = 'button',
  onClick,
  ...props
}: ButtonLinkProps) {
  const history = useHistory()
  return (
    <Button
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
      type={type}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}

export function Button({className = '', ...props}: any) {
  return (
    <button
      className={`px-4 py-2 bg-transparent rounded transition duration-200 hover:bg-muted ${className}`}
      {...props}
    />
  )
}
