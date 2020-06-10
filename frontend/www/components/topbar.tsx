import React from 'react'
import {useHistory} from 'react-router-dom'
import {Link} from 'components/link'
import Logo from './logo_square'
import {css} from 'emotion'

import Input from './input'
import {useMintter} from 'shared/mintterContext'
import {useEffect, useState} from 'react'
import Container from './container'
import Tippy from '@tippyjs/react'
import {Icons} from '@mintter/editor'
import {Button} from './button'

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
  const [menuVisible, setMenuVisible] = useState<boolean>(false)
  const {connectToPeerById} = useMintter()

  const show = () => setMenuVisible(true)
  const hide = () => setMenuVisible(false)

  async function handleSearch(e) {
    e.preventDefault()
    await setInput('')
    history.push(`/p/${input}`)
  }

  async function handlePeerConnection() {
    const peer = window.prompt(`enter a peer address`)
    await connectToPeerById([peer])
  }

  function toggleFormMetadata() {
    console.log('toggle!!')
    if (menuVisible) {
      hide()
    } else {
      show()
    }
  }

  return (
    <div className="flex items-center p-4 relative">
      <div className="flex-1 px-4 flex justify-start">
        <span className={`text-primary`}>
          <Link to="/library">
            <Logo width="50px" className="fill-current" />
          </Link>
        </span>
      </div>

      <div
        className={`w-full mx-auto px-5 ${css`
          max-width: 80ch;
        `}`}
      >
        <form className="w-full px-4" onSubmit={handleSearch}>
          <Input
            onChange={(e: any) => setInput(e.target.value)}
            name="hash-search"
            type="text"
            placeholder="Enter a publication CID"
            className="rounded-full"
          />
        </form>
      </div>
      <div className="flex-1 px-4 flex justify-end">
        <Tippy
          visible={menuVisible}
          onClickOutside={hide}
          interactive={true}
          content={
            <div
              className={`flex flex-col shadow-md ${css`
                // background: white;

                opacity: ${menuVisible ? '1' : '0'};
              `}`}
            >
              <Button
                onClick={() => {
                  hide()
                  history.push('/settings')
                }}
              >
                Settings
              </Button>
            </div>
          }
        >
          <span tabIndex={0}>
            <Button onClick={toggleFormMetadata} className="flex items-center">
              <span className="mr-2">Menu</span>
              <Icons.ChevronDown
                className={`transform transition duration-200 ${
                  menuVisible ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </span>
        </Tippy>
      </div>
    </div>
  )
}
