import {forwardRef} from 'react'
import {Link as RouterLink} from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({to, children, ...props}: LinkProps, ref) => {
  return (
    <RouterLink to={to} {...props} ref={ref}>
      {children}
    </RouterLink>
  )
})
Link.displayName = 'Link'
