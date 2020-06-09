import {Link as RouterLink, LinkProps} from 'react-router-dom'

export interface LinkProps
  extends LinkProps,
    React.HTMLAttributes<HTMLAnchorElement> {}

export default function DefaultLink({
  to,
  className = '',
  replace = false,
  ...props
}: LinkProps) {
  const {as, scroll, shallow, passHref, prefetch, ...otherProps} = props
  const linkProps = {to, as, scroll, shallow, passHref, prefetch}
  return (
    <RouterLink to={to} replace={replace} {...linkProps}>
      <a
        {...otherProps}
        className={`p-2 bg-transparent rounded ${className}`}
      />
    </RouterLink>
  )
}

export function Link(props) {
  return <RouterLink {...props} />
}
