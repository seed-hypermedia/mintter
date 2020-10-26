import {Link as RouterLink} from 'react-router-dom'

export default function DefaultLink({
  to,
  className = '',
  replace = false,
  ...props
}) {
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
