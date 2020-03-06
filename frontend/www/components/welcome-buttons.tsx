import {useRouter} from 'next/router'
import {MouseEvent} from 'react'
import Button, {ButtonProps} from './button'

export function NextButton({
  to,
  onClick,
  children,
  className,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <Button
      to={to}
      onClick={onClick}
      disabled={disabled}
      className={`text-green-500 transition-opacity border  ${
        disabled
          ? 'border-transparent opacity-50 hover:bg-transparent'
          : 'border-green-500 opacity-100 hover:bg-green-500 hover:text-white transition-all'
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
  className,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <Button
      to={to}
      onClick={onClick}
      disabled={disabled}
      className={`text-gray-500 hover:bg-transparent hover:opacity-100 ${
        disabled ? 'opacity-25' : 'opacity-50'
      } ${className}`}
      {...props}
    >
      {children}
    </Button>
  )
}
