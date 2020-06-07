import {useHistory} from 'react-router-dom'
import {Link} from 'components/link'
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
  const history = useHistory()
  const [input, setInput] = useState<string>('')
  const {connectToPeerById} = useMintter()

  async function handleSearch(e) {
    e.preventDefault()
    history.push(`/p/${input}`)
  }

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    await connectToPeerById([peer])
  }

  return (
    <>
      <div className="flex items-center px-8 py-4">
        <span className={`text-primary`}>
          <Link to="/library">
            <Logo width="50px" className="fill-current" />
          </Link>
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
            className="bg-info hover:bg-info-hover text-white font-bold py-2 px-4 rounded rounded-full flex items-center justify-center transition duration-100 ml-8"
            onClick={handlePeerConnection}
          >
            add connection
          </button>
        </div>
      </div>
    </>
  )
}
