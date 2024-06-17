import {SizableText} from '@shm/ui'
import {ReactNode} from 'react'
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
      <SizableText fontFamily="$body">{children}</SizableText>
    </NextLink>
  )
}
