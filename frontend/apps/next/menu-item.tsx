import {ReactNode} from 'react'
import {styled, Text} from 'tamagui'
import {NextLink} from './next-link'

const StyledText = styled(Text, {
  fontFamily: '$body',
  theme: 'green',
})

export function MenuItem({
  href,
  target,
  children,
}: {
  href: string
  target?: string
  children: ReactNode
}) {
  return (
    <NextLink href={href} target={target}>
      <StyledText>{children}</StyledText>
    </NextLink>
  )
}
