import React from 'react'
import {useState} from 'react'
import {useHistory, useRouteMatch} from 'react-router-dom'
import {Link} from 'components/link'
import Logo from './logo-square'
import {Input} from './input'
import {isLocalhost} from 'shared/is-localhost'
import {getPath} from 'components/routes'
import {CustomLogo} from './custom-logo'
import {Grid} from './grid'
import {Container} from './container'
import * as DropdownMenu from './dropdown-menu'

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
  const isLocal = isLocalhost(window.location.hostname)

  return isPublic ? (
    <Grid css={{bc: '$brandPrimary', borderBottom: '1px solid $colors$muted'}}>
      <Container
        css={{
          mx: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: '$2',
          px: '$3',
        }}
      >
        <Link to="/">
          {isLocal ? (
            <Logo css={{color: 'white'}} width="42px" />
          ) : (
            <CustomLogo />
          )}
        </Link>
        <Link
          to="/"
          className="text-sm font-medium hover:underline text-brand-secondary inline-block"
        >
          ← Back to Home
        </Link>
      </Container>
    </Grid>
  ) : (
    <Grid
      css={{
        gridAutoFlow: 'column',
        gridTemplateColumns: '100px 1fr 100px',
        py: '$2',
        px: '$3',
        borderBottom: '1px solid $colors$muted',
        alignItems: 'center',
      }}
    >
      <Link to={getPath(match)}>
        <Logo css={{color: '$brandPrimary'}} width="42px" />
      </Link>
      <Container>
        <MintterSearch />
      </Container>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onSelect={() => {
              history.push(`${getPath(match)}/settings`)
            }}
          >
            Settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Grid>
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
