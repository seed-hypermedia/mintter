import React from 'react'
import {css} from 'emotion'
import Link from './link'
import {useRouter} from 'next/router'

export default function Sidebar({children = null, ...props}) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  return (
    <React.Fragment>
      <div className="fixed flex w-full top-0 left-0 z-40 p-3 lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          aria-pressed={open}
          className="cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="fill-current h-3 w-3"
            viewBox="0 0 20 20"
          >
            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path>
          </svg>
        </button>
        <div className="px-5 text-left text-2xl font-bold">
          <Link href="/">Mintter</Link>
        </div>
      </div>

      <Wrapper {...props} open={open}>
        <div className="py-3 px-5 text-left text-2xl font-bold">
          <Link href="/">Mintter</Link>
        </div>
        <NavItem
          href="/library/drafts"
          isActive={router.pathname === '/drafts'}
          onClick={() => setOpen(false)}
          title="Drafts"
        />
        <NavItem
          href="/metrics"
          isActive={router.pathname === '/metrics'}
          onClick={() => setOpen(false)}
          title="Metrics"
        />
        <NavItem
          href="/settings"
          isActive={router.pathname === '/settings'}
          onClick={() => setOpen(false)}
          title="Settings"
        />
      </Wrapper>
    </React.Fragment>
  )
}

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

function NavItem({
  href,
  isActive = false,
  onClick,
  title,
  className,
  ...props
}: NavItemProps) {
  return (
    <div
      className={`p-3 transition-all ease-in-out duration-200 ${
        isActive ? 'font-bold' : 'hover:bg-muted'
      } ${className}`}
      {...props}
    >
      <Link href={href} className="text-lg block" onClick={onClick}>
        {title}
      </Link>
    </div>
  )
}

function Wrapper({children, open, ...props}) {
  return (
    <div
      className={`absolute top-0 left-0 z-30 lg:relative w-full max-w-xs text-body bg-background-muted h-full overflow-y-auto ${css`
        transition: all 0.25s;
        transform: translateX(${open ? '0' : '-100%'});
        @media (min-width: 1024px) {
          transform: translateX(0);
        }
      `}`}
      {...props}
    >
      {children}
    </div>
  )
}
