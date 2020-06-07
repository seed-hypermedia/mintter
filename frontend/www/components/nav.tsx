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
  console.log(`match for ${to}`, match)

  const active = useMemo(() => match?.path === to, [match, to])

  return (
    <Link
      to={to}
      className={`mx-2 p-2 text-md font-semibold hover:bg-background-muted hover:text-primary transition duration-200 relative ${className} ${
        active ? 'text-primary' : 'text-heading'
      } ${css`
        &:after {
          content: '';
          width: 100%;
          height: 2px;
          background-color: ${active ? 'var(--color-primary)' : 'transparent'};
          position: absolute;
          bottom: 0;
          left: 0;
        }
      `}`}
      {...props}
    >
      {children}
    </Link>
  )
}
