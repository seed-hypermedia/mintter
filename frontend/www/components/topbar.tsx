import {useState} from 'react'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {useHistory} from 'react-router-dom'
import {Icons} from '@mintter/editor'
import {Link} from 'components/link'
import Logo from './logo_square'
import Input from './input'
import {Button} from './button'
import Container from './container'

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

  const show = () => setMenuVisible(true)
  const hide = () => setMenuVisible(false)

  async function handleSearch(e) {
    e.preventDefault()
    await setInput('')
    history.push(`/p/${input}`)
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
    <div
      className={`p-4 pb-16 ${css`
        display: grid;
        grid-template-columns: minmax(250px, 25%) 1fr minmax(150px, 25%);
        grid-gap: 1rem;
      `}`}
    >
      <span className="text-primary">
        <Link to="/library">
          <Logo width="50px" className="fill-current" />
        </Link>
      </span>
      <div>
        <div
          className={`my-0 mx-auto ${css`
            max-width: 80ch;
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
