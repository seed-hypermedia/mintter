import {Link as RouterLink} from 'react-router-dom'

export default function DefaultLink({
  to,
  className = '',
  replace = false,
  children,
  ...props
}) {
  return (
    <RouterLink
      to={to}
      replace={replace}
      className={`p-2 bg-transparent rounded ${className}`}
      {...props}
    >
      {children}
    </RouterLink>
  )
}

export function Link({children, ...props}) {
  return <RouterLink {...props}>{children}</RouterLink>
}
