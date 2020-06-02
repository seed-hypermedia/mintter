import {useRouter} from 'next/router'
import Link from 'components/link'
import {css} from 'emotion'

export function MainNav() {
  const router = useRouter()
  return (
    <div className="mx-4 flex items-center">
      <NavItem href="/library" active={router.pathname.startsWith('/library/')}>
        Library
      </NavItem>
      <NavItem
        href="/settings"
        active={router.pathname.startsWith('/settings')}
      >
        Settings
      </NavItem>
    </div>
  )
}

export function NavItem({
  children,
  href,
  active = false,
  className = '',
  ...props
}) {
  return (
    <Link
      href={href}
      className={`mx-2 text-md font-semibold hover:bg-background-muted hover:text-primary transition duration-200 relative ${className} ${
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
