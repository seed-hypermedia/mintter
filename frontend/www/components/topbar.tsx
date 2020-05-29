import {useState} from 'react'
import {useRouter} from 'next/router'
import NextLink from 'next/link'
import {MainNav} from 'components/nav'
import Logo from './logo_square'

import Input from './input'

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

export default function LibraryHeader(props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="flex items-center px-8 py-4">
        <span className={`text-primary`}>
          <NextLink href="/library/publications">
            <a>
              <Logo width="50px" className="fill-current" />
            </a>
          </NextLink>
        </span>
        <MainNav />
        <div className="flex-1" />
        <div className="w-full max-w-xl pl-8">
          <Input
            name="hash-search"
            type="text"
            placeholder="Enter a publication CID"
          />
        </div>
      </div>
    </>
  )
}
