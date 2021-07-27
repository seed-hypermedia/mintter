import {Slot} from '@radix-ui/react-slot'
import {useRef} from 'react'
import {useHistory, useRouteMatch} from 'react-router-dom'

import {Box, Button, Icon, Text, TextField} from '@mintter/ui'

import {Container} from './container'
import {getPath} from '../utils/routes'

import {Link} from './link'
import {MINTTER_LINK_PREFIX} from '../editor/constants'

interface NavItemProps {
  href: string
  onClick: () => void
  isActive: boolean
  title: string
  className?: string
}

export function Topbar({isPublic = false}: {isPublic?: boolean}) {
  const history = useHistory()
  const {path} = useRouteMatch()

  return isPublic ? (
    <Box>public topbar here</Box>
  ) : (
    <Box
      css={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridTemplateColumns: '100px 1fr 100px',
        paddingHorizontal: '$5',
        height: 64,
        gap: '$4',
        borderBottom: '1px solid $colors$background-neutral',
        alignItems: 'center',
      }}
    >
      <Link to={`/`}>
        <Icon name="Mintter" size="2" color="primary" />
      </Link>
      {/* //@ts-ignore */}
      <Container
        css={{
          marginHorizontal: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <MintterSearch />
      </Container>
      <Box css={{display: 'flex', justifyContent: 'flex-end'}}>
        <Button
          //@ts-ignore
          as={Link}
          to={`/settings`}
          variant="ghost"
          size="1"
        >
          <Icon name="GearOutlined" size="1" />
        </Button>
      </Box>
    </Box>
  )
}

function MintterSearch() {
  const ref = useRef<HTMLInputElement>(null)
  const history = useHistory()
  const {path} = useRouteMatch()

  // TODO: fix types
  async function handleSearch(e: any) {
    e.preventDefault()
    let to = ref.current?.value as string
    if (to.includes(MINTTER_LINK_PREFIX)) {
      to = to.split('/')[2]
    }
    // console.log('input value', {to, original: ref.current.value})

    if (ref.current) {
      ref.current.value = ''
    }

    history.push(`/p/${to}`)
  }

  return (
    <Box as="form" css={{width: '100%'}} onSubmit={handleSearch}>
      <TextField ref={ref} type="text" name="hash-search" placeholder="Enter a publication CID" shape="pill" />
    </Box>
  )
}
