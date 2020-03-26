import Button, {ButtonProps} from './button'

export function NextButton({
  to,
  onClick,
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <Button
      type={type}
      to={to}
      onClick={onClick}
      disabled={disabled}
      className={`text-success border  ${
        disabled
          ? 'border-transparent opacity-50 hover:bg-transparent cursor-not-allowed'
          : 'border-success opacity-100 hover:bg-success hover:text-white'
      } ${className}`}
      {...props}
    >
      {children}
    </Button>
  )
}

export function BackButton({
  to,
  onClick,
  children,
  className = '',
  type = 'button',
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <Button
      type={type}
      to={to}
      onClick={onClick}
      disabled={disabled}
      className={`text-secondary hover:bg-transparent hover:opacity-100 ${
        disabled ? 'opacity-25' : 'opacity-50'
      } ${className}`}
      {...props}
    >
      {children}
    </Button>
  )
}
