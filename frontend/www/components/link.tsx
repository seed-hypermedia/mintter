import NextLink, {LinkProps as NextLinkProps} from 'next/link'

export interface LinkProps
  extends NextLinkProps,
    React.HTMLAttributes<HTMLAnchorElement> {}

export default function Link({href, className = '', ...props}: LinkProps) {
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
        className={`px-4 py-2 bg-transparent rounded ${className}`}
      />
    </NextLink>
  )
}
