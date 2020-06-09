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
  return (
    <RouterLink
      to={to}
      replace={replace}
      className={`p-2 bg-transparent rounded ${className}`}
      {...props}
    />
  )
}

export function Link(props) {
  return <RouterLink {...props} />
}
