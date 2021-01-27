import React from 'react'
import {useState} from 'react'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {useHistory, useRouteMatch} from 'react-router-dom'
import {Icons} from 'components/icons'
import {Link} from 'components/link'
import Logo from './logo-square'
import Input from './input'
import {Button} from './button'
import {isLocalhost} from 'shared/is-localhost'
import {getPath} from 'components/routes'
import {CustomLogo} from './custom-logo'

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

export default function Topbar({isPublic = false}) {
  const history = useHistory()
  const match = useRouteMatch()
  const [menuVisible, setMenuVisible] = useState<boolean>(false)
  const isLocal = isLocalhost(window.location.hostname)
  const show = React.useCallback(() => setMenuVisible(true), [setMenuVisible])
  const hide = React.useCallback(() => setMenuVisible(false), [setMenuVisible])

  function toggleFormMetadata() {
    if (menuVisible) {
      hide()
    } else {
      show()
    }
  }

  return isPublic ? (
    <div className="p-4 w-full border-b bg-brand-primary">
      <div
        className={`w-full mx-4 md:mx-16 flex items-end justify-between ${css`
          max-width: 50ch;
        `}`}
      >
        <span className="text-primary flex items-center">
          <Link to="/">
            {isLocal ? (
              <Logo width="42px" className="fill-current" />
            ) : (
              <CustomLogo />
            )}
          </Link>
        </span>
        <Link
          to="/"
          className="text-sm font-medium hover:underline text-brand-secondary inline-block"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  ) : (
    <div
      className={`border-b border-background-muted grid grid-flow-col gap-4`}
    >
      <span className="text-primary flex items-center py-4 pl-4 md:pl-16">
        <Link to={getPath(match)}>
          <Logo width="42px" className="fill-current" />
        </Link>
      </span>
      <div className="py-4">
        <div className={`w-full px-4 md:px-6`}>
          <MintterSearch />
        </div>
      </div>

      <div className="flex justify-end pr-4 py-4">
        <Tippy
          visible={menuVisible}
          onClickOutside={hide}
          interactive={true}
          content={
            <div
              className={`flex flex-col shadow-md ${css`
                opacity: ${menuVisible ? '1' : '0'};
              `}`}
            >
              <Button
                className="text-body bg-background"
                onClick={() => {
                  hide()
                  history.push(`${getPath(match)}/settings`)
                }}
              >
                Settings
              </Button>
            </div>
          }
        >
          <span tabIndex={0}>
            <Button onClick={toggleFormMetadata} className="flex items-center">
              <span className="mr-2 text-body">Menu</span>
              <Icons.ChevronDown
                className={`transform transition duration-200 text-body ${
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

function MintterSearch() {
  const ref = React.useRef<HTMLInputElement>(null)
  const history = useHistory()
  const match = useRouteMatch()
  async function handleSearch(e) {
    e.preventDefault()
    let to = ref.current.value
    if (to.includes('mintter://')) {
      to = to.split('/')[2]
    }
    // console.log('input value', {to, original: ref.current.value})

    ref.current.value = ''

    history.push(`${getPath(match)}/p/${to}`)
  }

  return (
    <form className="w-full" onSubmit={handleSearch}>
      <Input
        ref={ref}
        name="hash-search"
        type="text"
        placeholder="Enter a publication CID"
        className="rounded-full"
      />
    </form>
  )
}
