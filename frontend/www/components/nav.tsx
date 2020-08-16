import {useRouteMatch} from 'react-router-dom'
import {Link} from 'components/link'
import {css} from 'emotion'
import {useMemo} from 'react'

export function MainNav() {
  return (
    <div className="mx-4 flex items-center">
      <NavItem to="/library">Library</NavItem>
      <NavItem to="/settings">Settings</NavItem>
    </div>
  )
}

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
