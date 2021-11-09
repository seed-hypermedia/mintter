import {createDraft} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {css, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {useActor} from '@xstate/react'
import {useSidepanel} from 'frontend/app/src/components/sidepanel'
import {FormEvent, useCallback, useEffect, useRef, useState} from 'react'
import {useQueryClient} from 'react-query'
import {Link, useLocation} from 'wouter'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {Settings} from '../settings'
import {Tooltip} from '../tooltip'

export const TopbarStyled = styled(Box, {
  gridArea: 'topbar',
  width: '$full',
  height: 48,
  display: 'flex',
  boxShadow: '0 0 0 1px $colors$background-neutral',
  background: '$background-default',
})

export const topbarSection = css({
  height: '$full',
  display: 'flex',
  alignItems: 'center',
})

export function Topbar() {
  return (
    <TopbarStyled>
      <SidenavBar />
      <MainBar />
      <TopbarActions />
    </TopbarStyled>
  )
}

function SidenavBar() {
  // const {toggle} = useSidebar()
  return (
    <Box
      className={topbarSection()}
      css={{
        width: 232,
        flex: 'none',
        justifyContent: 'space-between',
        backgroundColor: '$background-default',
        paddingLeft: '$5',
        paddingRight: '$3',
      }}
    >
      <Link to="/">
        <Text alt fontWeight="bold" size="5">
          Mintter
        </Text>
      </Link>
      <Box css={{display: 'flex', gap: '$4'}}>
        {/* <Button variant="ghost" size="0" color="muted">
          <Icon name="CardStackPlus" size="2" />
        </Button> */}
        <Button variant="ghost" size="0" color="muted">
          <Icon name="Sidenav" size="2" />
        </Button>
      </Box>
    </Box>
  )
}

function MainBar() {
  const [routeLocation, setRouteLocation] = useLocation()
  const client = useQueryClient()
  let form = useRef(null)
  const [location, setLocation] = useState(() => routeLocation)
  const onCreateDraft = useCallback(async function onCreateDraft() {
    try {
      const d = await createDraft()
      if (d?.id) {
        await client.refetchQueries('DraftList')
        setRouteLocation(`/editor/${d.id}`)
        setLocation(`/editor/${d.id}`)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (form.current) {
      const data = new FormData(form.current)

      let search: string = data.get('search') as string

      let url = search.startsWith('/p/')
        ? search
        : search.startsWith(MINTTER_LINK_PREFIX)
        ? `/p/${search.replace(MINTTER_LINK_PREFIX, '')}`
        : `/p/${search}`
      console.log('SUBMIT!!', url)
      setLocation(url)
      setRouteLocation(url)
    } else {
      console.error('Search Submit ERROR: not a form attached!')
    }
  }

  useEffect(() => {
    setLocation(routeLocation)
  }, [routeLocation])

  return (
    <Box
      className={topbarSection()}
      css={{
        paddingLeft: '$5',
        paddingRight: '$3',
        pointerEvents: 'all',
        flex: 1,
        display: 'flex',
        gap: '$5',
      }}
    >
      <Button size="0" variant="ghost" color="muted" onClick={onCreateDraft}>
        <Icon name="PencilAdd" color="muted" />
      </Button>
      <TopbarNavigation />
      <Box ref={form} css={{width: '100%', maxWidth: '800px'}} as="form" onSubmit={handleSubmit}>
        <TextField size={1} name="search" value={location} onChange={(e) => setLocation(e.target.value)} />
      </Box>
    </Box>
  )
}

function TopbarNavigation() {
  return (
    <Box css={{display: 'flex'}}>
      <Button size="0" variant="ghost" color="muted" onClick={() => window.history.back()}>
        <Icon name="ArrowChevronLeft" color="muted" />
      </Button>
      <Button size="0" variant="ghost" color="muted" onClick={() => window.history.forward()}>
        <Icon name="ArrowChevronRight" color="muted" />
      </Button>
    </Box>
  )
}

function TopbarActions() {
  const service = useSidepanel()
  const [state, send] = useActor(service)

  const canSidepanel = state.matches('enabled')

  function toggleSidepanel() {
    send('SIDEPANEL_TOGGLE')
  }

  return (
    <Box
      className={topbarSection()}
      css={{
        flex: 'none',
        paddingLeft: '$7',
        paddingRight: '$4',
        pointerEvents: 'all',
        display: 'flex',
        gap: '$4',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {canSidepanel && (
        <Tooltip content="Toogle Sidepanel">
          <Button size="0" variant="ghost" color="muted" onClick={toggleSidepanel}>
            <Icon name="Sidepanel" color="muted" />
          </Button>
        </Tooltip>
      )}
      <Settings />
    </Box>
  )
}
