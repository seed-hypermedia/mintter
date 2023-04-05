import {ReactNode} from 'react'
import {Text} from '@mintter/ui'
import {NextLink} from './next-link'

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
      <Text fontFamily="$body">{children}</Text>
    </NextLink>
  )
}
