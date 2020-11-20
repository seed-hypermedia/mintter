import {useRouteMatch} from 'react-router-dom'
import {Link} from 'components/link'
import {useMemo} from 'react'

export function NavItem({
  children,
  to,
  className = '',
  onlyActiveWhenExact = false,
  ...props
}) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  })

  const active = useMemo(() => match?.path === to, [match, to])

  return (
    <Link
      to={to}
      className={`py-2 px-4 text-md font-light hover:bg-background-muted transition duration-200 relative text-heading rounded overflow-hidden ${className} ${
        active ? 'font-extrabold' : ''
      }`}
      {...props}
    >
      {children}
    </Link>
  )
}
