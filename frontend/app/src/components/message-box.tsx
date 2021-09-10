import type {ButtonProps} from '@mintter/ui/button'
import {Button as UIButton} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {Box} from '@mintter/ui/box'
import type React from 'react'

export function Root({children}: any) {
  return (
    <Box
      css={{
        backgroundColor: '$background-muted',
        padding: '$6',
        marginVertical: '$6',
        display: 'grid',
        gridAutoFlow: 'row',
        alignItems: 'center',
        borderRadius: '$3',
        boxShadow: 'inset 0 0 0 1px $colors$background-neutral-soft, 0 0 0 1px $colors$background-neutral-soft',
        textAlign: 'center',
        gap: '$5',
      }}
    >
      {children}
    </Box>
  )
}

export function Title({children}: any) {
  return <Text size="7">{children}</Text>
}

export function Button({
  children,
  ...props
}: ButtonProps & {children: React.ReactChild; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void}) {
  return (
    <UIButton variant="outlined" color="primary" {...props}>
      {children}
    </UIButton>
  )
}
