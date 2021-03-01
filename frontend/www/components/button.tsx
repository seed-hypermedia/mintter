import {useHistory} from 'react-router-dom'
import {styled} from 'shared/stitches.config'
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

export function Button2({className = '', ...props}: any) {
  return (
    <button
      className={`px-4 py-2 bg-transparent rounded transition duration-200 hover:bg-muted ${className}`}
      {...props}
    />
  )
}

export const Button = styled('button', {
  all: 'unset',
  lineHeight: '1',
  height: '$5',
  margin: '0',
  outline: 'none',
  padding: '0',
  textDecoration: 'none',
  userSelect: 'none',
  textAlign: 'center',
  WebkitTapHighlightColor: 'rgba(0,0,0,0)',
  display: 'inline-flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$2',
  px: '$2',
  fontFamily: '$ui',
  transition:
    'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 25ms linear',
  border: 'none',
  fontSize: '$2',
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
  '&:before': {
    boxSizing: 'border-box',
  },
  '&:after': {
    boxSizing: 'border-box',
  },
  '&:hover': {
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px $colors$gray700',
  },
  '&:active': {
    bc: '$gray100',
    boxShadow: 'inset 0 0 0 1px $colors$gray700',
  },
  '&:focus': {
    outline: 'none',
    boxShadow: 'inset 0 0 0 1px $colors$gray700, 0 0 0 1px $colors$gray700',
  },
  '&:disabled': {
    bc: '$gray100',
    boxShadow: 'inset 0 0 0 1px $colors$gray600',
    color: '$gray700',
    pointerEvents: 'none',
  },
  variants: {
    size: {
      1: {
        height: '$5',
        px: '$2',
        fontSize: '$2',
      },
      2: {
        height: '$6',
        px: '$3',
        fontSize: '$3',
      },
      3: {
        height: '$7',
        px: '$5',
        fontSize: '$5',
      },
    },
    variant: {
      transparent: {
        fontWeight: '$2',
        bc: 'transparent',
        color: '$brandPrimary',
        boxShadow: 'inset 0 0 0 1px transparent',
        '&:hover': {
          bc: 'transparent',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimary',
        },
        '&:active': {
          bc: '$muted',
          boxShadow: 'inset 0 0 0 1px transparent',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$brandPrimary, 0 0 0 1px $colors$brandPrimary',
        },
        '&:disabled': {
          bc: 'transparent',
          boxShadow: 'inset 0 0 0 1px transparent',
          color: '$gray300',
          pointerEvents: 'none',
        },
      },
      muted: {
        bc: '$muted',
        color: '$text',
        boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        '&:hover': {
          bc: '$mutedHover',
          boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        },
        '&:active': {
          bc: '$mutedHover',
          boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$mutedHover, 0 0 0 1px $colors$mutedHover',
        },
        '&:disabled': {
          bc: '$muted',
          boxShadow: 'inset 0 0 0 1px $colors$muted',
          color: '$text',
          pointerEvents: 'none',
          opacity: 0.5,
        },
      },
      primary: {
        bc: '$brandPrimary',
        color: 'white',
        boxShadow: 'inset 0 0 0 1px $colors$brandPrimary',
        '&:hover': {
          bc: '$brandPrimaryHover',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:active': {
          bc: '$brandPrimaryHover',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$brandPrimaryHover, 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:disabled': {
          bc: '$brandPrimary',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimary',
          color: '$white',
          pointerEvents: 'none',
          opacity: 0.5,
        },
      },
      success: {
        bc: '$accentSuccess',
        color: 'white',
        '&:hover': {
          bc: '$accentSuccessHover',
          boxShadow: 'inset 0 0 0 1px $colors$accentSuccessHover',
        },
        '&:active': {
          bc: '$accentSuccessHover',
          boxShadow: 'inset 0 0 0 1px $colors$accentSuccessHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$accentSuccessHover, 0 0 0 1px $colors$accentSuccessHover',
        },
        '&:disabled': {
          bc: '$accentSuccess',
          boxShadow: 'inset 0 0 0 1px $colors$accentSuccess',
          color: 'white',
          pointerEvents: 'none',
          opacity: 0.5,
        },
      },
    },
    // state: {
    //   active: {},
    //   waiting: {},
    // },
    appearance: {
      pill: {
        borderRadius: '$pill',
      },
      rounded: {
        borderRadius: '$1',
      },
      square: {
        borderRadius: '0',
      },
      outline: {
        bc: 'transparent',
        borderRadius: '$pill',
        borderWidth: '1px',
        borderStyle: 'solid',
      },
      plain: {
        borderColor: 'transparent',
        borderRadius: '$1',

        bc: 'transparent',
        boxShadow: 'inset 0 0 0 1px transparent',
      },
    },
  },
  defaultVariants: {
    size: '$1',
    appearance: 'rounded',
    variant: 'muted',
  },
  compoundVariants: [
    {
      variant: 'muted',
      appearance: 'outline',
      css: {
        color: '$muted',
        bc: 'transparent',
        borderColor: '$muted',
        '&:hover, &:active, &:focus': {
          bc: 'transparent',
          borderColor: '$mutedHover',
        },
        '&:disabled': {
          bc: 'transparent',
          borderColor: '$mutedHover',
          opacity: 0.5,
        },
      },
    },
    {
      variant: 'primary',
      appearance: 'outline',
      css: {
        color: '$brandPrimary',
        bc: 'transparent',
        borderColor: '$brandPrimary',
        '&:hover, &:active, &:focus': {
          bc: '$brandPrimary',
          borderColor: '$brandPrimary',
          color: 'white',
        },
        '&:disabled': {
          bc: 'transparent',
          borderColor: '$brandPrimaryHover',
          opacity: 0.5,
        },
      },
    },
    {
      variant: 'success',
      appearance: 'outline',
      css: {
        color: '$accentSuccess',
        bc: 'transparent',
        borderColor: '$accentSuccess',
        '&:hover, &:active, &:focus': {
          bc: '$accentSuccess',
          borderColor: '$accentSuccess',
          color: 'white',
        },
        '&:disabled': {
          bc: 'transparent',
          borderColor: '$accentSuccessHover',
          opacity: 0.5,
        },
      },
    },
    {
      variant: 'primary',
      appearance: 'plain',
      css: {
        color: '$brandPrimary',
        bc: 'transparent',
        borderColor: 'transparent',
        boxShadow: 'inset 0 0 0 1px transparent',
        '&:hover, &:active, &:focus': {
          bc: 'transparent',
          borderColor: '$brandPrimary',
          boxShadow:
            'inset 0 0 0 1px $colors$brandPrimary, 0 0 0 1px $colors$brandPrimary',
          color: '$brandPrimary',
        },
        '&:disabled': {
          bc: 'transparent',
          color: '$brandPrimary',
          opacity: 0.5,
          boxShadow: 'inset 0 0 0 1px transparent',
        },
      },
    },
    {
      variant: 'muted',
      appearance: 'plain',
      css: {
        color: '$text',
        bc: 'transparent',
        borderColor: 'transparent',
        boxShadow: 'inset 0 0 0 1px transparent',
        '&:hover, &:active, &:focus': {
          bc: 'transparent',
          color: '$text',
          boxShadow:
            'inset 0 0 0 1px $colors$mutedHover, 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:disabled': {
          bc: 'transparent',
          color: '$text',
          opacity: 0.5,
          boxShadow: 'inset 0 0 0 1px transparent',
        },
      },
    },
    {
      variant: 'success',
      appearance: 'plain',
      css: {
        color: '$accentSuccess',
        bc: 'transparent',
        borderColor: 'transparent',
        '&:hover, &:active, &:focus': {
          bc: 'transparent',
          color: '$accentSuccessHover',
        },
        '&:disabled': {
          bc: 'transparent',
          color: '$accentSuccess',
          opacity: 0.5,
        },
      },
    },
  ],
})

export function NextButton({
  to,
  onClick,
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}: ButtonLinkProps) {
  return (
    <Button
      type={type}
      to={to}
      onClick={onClick}
      disabled={disabled}
      css={{
        '&:disabled': {
          border: 'transparent',
          opacity: 0.5,
        },
      }}
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
}: ButtonLinkProps) {
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
