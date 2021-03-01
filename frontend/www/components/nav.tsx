import {useRouteMatch} from 'react-router-dom'
import {Link} from 'components/link'
import {Button} from 'components/button'
import {useMemo} from 'react'

export function NavItem({children, to, onlyActiveWhenExact = false, ...props}) {
  const match = useRouteMatch({
    path: to,
    exact: onlyActiveWhenExact,
  })

  const active = useMemo(() => match?.path === to, [match, to])

  return (
    <Button
      to={to}
      as={Link}
      size="2"
      appearance="plain"
      variant={active ? 'primary' : 'muted'}
      css={{
        mx: 0,
      }}
      {...props}
    >
      {children}
    </Button>
    // <Link
    //   to={to}
    //   className={`py-2 px-4 text-md font-light hover:bg-background-muted transition duration-200 relative text-heading rounded overflow-hidden ${className} ${
    //     active ? 'font-extrabold' : ''
    //   }`}
    //   {...props}
    // >
    //   {children}
    // </Link>
  )
}
