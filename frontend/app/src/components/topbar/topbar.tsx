import {Box} from '@mintter/ui/box'
import {Button, buttonStyles} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {TextField} from '@mintter/ui/text-field'
import {FormEvent, PropsWithChildren, useRef} from 'react'
import {Link, useLocation} from 'wouter'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {Container} from '../container'

const SettingsButton = styled(Link, buttonStyles)

export function Topbar(props: PropsWithChildren<unknown>) {
  return (
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
      {...props}
    >
      <Link to={`/`}>
        <Icon name="Mintter" size="2" color="primary" />
      </Link>
      <Container
        css={{
          marginHorizontal: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box
          css={{
            display: 'flex',
            marginRight: '$4',
          }}
        >
          <Button color="muted" variant="ghost" size="1" onClick={() => history.back()}>
            <Icon name="ArrowLeft" />
          </Button>
          <Button color="muted" variant="ghost" size="1" onClick={() => history.forward()}>
            <Icon name="ArrowRight" />
          </Button>
        </Box>
        <Search />
      </Container>
      <Box css={{display: 'flex', justifyContent: 'flex-end'}}>
        <SettingsButton to={`/settings`} variant="ghost" size="1">
          <Icon name="GearOutlined" size="1" />
        </SettingsButton>
      </Box>
    </Box>
  )
}

function Search() {
  const ref = useRef<HTMLInputElement>(null)
  const [, setLocation] = useLocation()

  // TODO: fix types
  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    let to = ref.current?.value as string
    if (to.includes(MINTTER_LINK_PREFIX)) {
      to = to.split('/')[2]
    }
    // console.log('input value', {to, original: ref.current.value})

    if (ref.current) {
      ref.current.value = ''
    }

    setLocation(`/p/${to}`)
  }

  return (
    <Box as="form" css={{width: '100%'}} onSubmit={handleSearch}>
      <TextField ref={ref} name="hash-search" placeholder="Enter a publication CID" shape="pill" />
    </Box>
  )
}
