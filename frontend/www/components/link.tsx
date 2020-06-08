import {Link as RouterLink} from 'react-router-dom'
import NextLink, {LinkProps as NextLinkProps} from 'next/link'

export interface LinkProps
  extends NextLinkProps,
    React.HTMLAttributes<HTMLAnchorElement> {}

export default function DefaultLink({
  href,
  className = '',
  ...props
}: LinkProps) {
  const {
    as,
    replace,
    scroll,
    shallow,
    passHref,
    prefetch,
    ...otherProps
  } = props
  const linkProps = {href, as, replace, scroll, shallow, passHref, prefetch}
  return (
    <NextLink href={href} {...linkProps}>
      <a
        {...otherProps}
        className={`p-2 bg-transparent rounded ${className}`}
      />
    </NextLink>
  )
}

export function Link(props) {
  return <RouterLink {...props} />
}
