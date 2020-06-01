import {useRouter} from 'next/router'
import NextLink from 'next/link'
import {MainNav} from 'components/nav'
import Logo from './logo_square'

import Input from './input'
import {useMintter} from 'shared/mintterContext'
import {useEffect, useState} from 'react'

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

export default function LibraryHeader(props) {
  const router = useRouter()
  const [input, setInput] = useState<string>('')
  const {searchPublicationById, connectToPeerById} = useMintter()

  async function handleSearch(e) {
    e.preventDefault()
    try {
      const res = await searchPublicationById(input)
      console.log('handleSearch -> res', res)
    } catch (err) {
      throw new Error(`error in topbar => ${err}`)
    }
  }

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    await connectToPeerById([peer])
    console.log('Success!')
  }

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
        <div className="w-full max-w-xl pl-8 flex">
          <form onSubmit={handleSearch} className="flex-1">
            <Input
              onChange={(e: any) => setInput(e.target.value)}
              name="hash-search"
              type="text"
              placeholder="Enter a publication CID"
            />
          </form>
          <button
            className="bg-primary text-white hover:bg-primary-hover px-4 py-2 font-bold ml-12 rounded-full"
            onClick={handlePeerConnection}
          >
            add connection
          </button>
        </div>
      </div>
    </>
  )
}
