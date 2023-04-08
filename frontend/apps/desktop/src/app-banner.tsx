import {Box} from '@components/box'
import {Text} from '@components/text'
import {keyframes} from '@stitches/react'
import {MouseEventHandler, ReactNode} from 'react'

const slideDown = keyframes({
  '0%': {transform: 'translateY(-100%)', opacity: 0},
  '100%': {transform: 'translateY(0)', opacity: 1},
})

export function AppBanner({
  children,
  ...props
}: {
  children: ReactNode
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
}) {
  return (
    <Box
      css={{
        opacity: 0,
        animation: `${slideDown} 200ms`,
        animationDelay: '300ms',
        animationFillMode: 'forwards',
        paddingInline: '$4',
        paddingBlock: '$2',
        background: '$warning-background-subtle',
        cursor: 'pointer',
        borderBottom: '1px solid blue',
        borderColor: '$warning-border-normal',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        '&:hover': {
          background: '$warning-background-normal',
        },
        position: 'absolute',
        width: '$full',
        top: 40,
        left: 0,
        zIndex: '$max',
      }}
      {...props}
    >
      {children}
    </Box>
  )
}

// export function BannerText({css, ...props}: TextProps & {css?: CSS}) {
export function BannerText({css, ...props}: any) {
  return (
    <Text
      {...props}
      css={{
        color: '$warning-text-low',
        textAlign: 'center',
        fontSize: '$1',
        ...css,
      }}
      size="1"
    />
  )
}
