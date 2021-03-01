import {StitchesCss} from '@stitches/react'
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
    backgroundColor: '$gray100',
    boxShadow: 'inset 0 0 0 1px $colors$gray700',
  },
  '&:focus': {
    outline: 'none',
    boxShadow: 'inset 0 0 0 1px $colors$gray700, 0 0 0 1px $colors$gray700',
  },
  '&:disabled': {
    backgroundColor: '$gray100',
    boxShadow: 'inset 0 0 0 1px $colors$gray600',
    color: '$gray700',
    pointerEvents: 'none',
  },
  variants: {
    size: {
      '1': {
        height: '$5',
        px: '$2',
        fontSize: '$2',
      },
      '2': {
        height: '$6',
        px: '$3',
        fontSize: '$3',
      },
      '3': {
        height: '$7',
        px: '$5',
        fontSize: '$5',
      },
    },
    variant: {
      transparent: {
        fontWeight: '$2',
        backgroundColor: 'transparent',
        color: '$brandPrimary',
        boxShadow: 'inset 0 0 0 1px transparent',
        '&:hover': {
          backgroundColor: 'transparent',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimary',
        },
        '&:active': {
          backgroundColor: '$muted',
          boxShadow: 'inset 0 0 0 1px transparent',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$brandPrimary, 0 0 0 1px $colors$brandPrimary',
        },
      },
      muted: {
        backgroundColor: '$muted',
        color: '$text',
        boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        '&:hover': {
          backgroundColor: '$mutedHover',
          boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        },
        '&:active': {
          backgroundColor: '$mutedHover',
          boxShadow: 'inset 0 0 0 1px $colors$mutedHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$mutedHover, 0 0 0 1px $colors$mutedHover',
        },
      },
      primary: {
        backgroundColor: '$brandPrimary',
        color: 'white',
        boxShadow: 'inset 0 0 0 1px $colors$brandPrimary',
        '&:hover': {
          backgroundColor: '$brandPrimaryHover',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:active': {
          backgroundColor: '$brandPrimaryHover',
          boxShadow: 'inset 0 0 0 1px $colors$brandPrimaryHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$brandPrimaryHover, 0 0 0 1px $colors$brandPrimaryHover',
        },
      },
      success: {
        backgroundColor: '$accentSuccess',
        color: 'white',
        '&:hover': {
          backgroundColor: '$accentSuccessHover',
          boxShadow: 'inset 0 0 0 1px $colors$accentSuccessHover',
        },
        '&:active': {
          backgroundColor: '$accentSuccessHover',
          boxShadow: 'inset 0 0 0 1px $colors$accentSuccessHover',
        },
        '&:focus': {
          boxShadow:
            'inset 0 0 0 1px $colors$accentSuccessHover, 0 0 0 1px $colors$accentSuccessHover',
        },
      },
    },
    state: {
      active: {},
      waiting: {},
    },
    appearance: {
      pill: {
        borderRadius: '$pill',
      },
      rounded: {
        borderRadius: '$1',
      },
    },
  },
  defaultVariants: {
    size: '$1',
    appearance: 'rounded',
    variant: 'transparent',
  },
})
