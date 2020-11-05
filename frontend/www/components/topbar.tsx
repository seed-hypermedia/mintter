import {useCallback} from 'react'
import {useState} from 'react'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {useHistory} from 'react-router-dom'
import {Icons} from '@mintter/editor'
import {Link} from 'components/link'
import Logo from './logo_square'
import Input from './input'
import {Button} from './button'
import {isLocalhost} from 'shared/isLocalhost'

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

export default function Topbar({isPublic = false}) {
  const history = useHistory()
  const [input, setInput] = useState<string>('')
  const [menuVisible, setMenuVisible] = useState<boolean>(false)
  const isLocal = isLocalhost(window.location.hostname)
  const show = useCallback(() => setMenuVisible(true), [setMenuVisible])
  const hide = useCallback(() => setMenuVisible(false), [setMenuVisible])

  async function handleSearch(e) {
    e.preventDefault()
    await setInput('')
    history.push(`/p/${input}`)
  }

  function toggleFormMetadata() {
    if (menuVisible) {
      hide()
    } else {
      show()
    }
  }

  return isPublic ? (
    <div className="p-4 w-full border-b">
      <div
        className={`mx-16 ${css`
          max-width: 50ch;
        `}`}
      >
        <span className="text-primary flex items-center">
          <Link to="/">
            <span className="text-primary">
              <Logo width="42px" className="fill-current" />
            </span>
          </Link>
          {isLocal && (
            <Link to="/private">
              <span className="mx-4 px-2 text-xs">Go to Private page</span>
            </Link>
          )}
        </span>
      </div>
    </div>
  ) : (
    <div
      className={`p-4 border-b grid grid-flow-col gap-4 ${css`
        grid-template-columns: minmax(250px, 25%) 1fr minmax(250px, 25%);
      `}`}
    >
      <span className="text-primary flex items-center">
        <Link to="/private">
          <Logo width="42px" className="fill-current" />
        </Link>
        <Link to="/">
          <span className="mx-4 px-2 text-xs">Go to Public page</span>
        </Link>
      </span>
      <div>
        <div
          className={`my-0 mx-16 ${css`
            max-width: 50ch;
            width: 100%;
          `}`}
        >
          <form className="w-full" onSubmit={handleSearch}>
            <Input
              onChange={(e: any) => setInput(e.target.value)}
              name="hash-search"
              type="text"
              placeholder="Enter a publication CID"
              className="rounded-full"
            />
          </form>
        </div>
      </div>

      <div className="flex justify-end">
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
                className="text-body"
                onClick={() => {
                  hide()
                  history.push('/private/settings')
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
