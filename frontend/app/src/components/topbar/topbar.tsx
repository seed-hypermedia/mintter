import {createDraft} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {css, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {useCallback} from 'react'
import {useQueryClient} from 'react-query'
import {Link, useLocation} from 'wouter'
import {Settings} from '../settings'
import {SIDEBAR_WIDTH} from '../sidebar'
import {useSidepanel} from '../sidepanel'
import {Tooltip} from '../tooltip'

export const TopbarStyled = styled(Box, {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  zIndex: '$max',
  width: '$full',
  height: 64,
  display: 'flex',
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
  return (
    <Box
      className={topbarSection()}
      css={{
        width: SIDEBAR_WIDTH,
        flex: 'none',
        justifyContent: 'space-between',
        paddingLeft: '$7',
        paddingRight: '$4',
      }}
    >
      <Link to="/">
        <Text alt fontWeight="bold" size="5">
          Mintter
        </Text>
      </Link>
      <Box css={{display: 'flex', gap: '$4'}}>
        <Button variant="ghost" size="0" color="muted">
          <Icon name="CardStackPlus" size="2" />
        </Button>
        <Button variant="ghost" size="0" color="muted">
          <Icon name="Sidenav" size="2" />
        </Button>
      </Box>
    </Box>
  )
}

function MainBar() {
  const [location, setLocation] = useLocation()
  const client = useQueryClient()
  const onCreateDraft = useCallback(async function onCreateDraft() {
    try {
      const d = await createDraft()
      if (d?.id) {
        client.refetchQueries('DraftsList')
        setLocation(`/editor/${d.id}`)
      }
    } catch (err) {
      console.warn(`createDraft Error: "createDraft" does not returned a Document`, err)
    }
  }, [])
  return (
    <Box
      className={topbarSection()}
      css={{
        paddingLeft: '$7',
        paddingRight: '$4',
        pointerEvents: 'all',
        flex: 1,
        display: 'flex',
        gap: '$5',
        background: '$background-alt',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      <Button size="1" variant="ghost" color="muted" onClick={onCreateDraft}>
        <Icon name="PencilAdd" color="muted" />
      </Button>
      <TopbarNavigation />
      <Box css={{width: '100%', maxWidth: '800px'}}>
        <TextField value={location} />
      </Box>
    </Box>
  )
}

function TopbarNavigation() {
  return (
    <Box css={{display: 'flex'}}>
      <Button size="1" variant="ghost" color="muted" onClick={() => window.history.back()}>
        <Icon name="ArrowChevronLeft" color="muted" />
      </Button>
      <Button size="1" variant="ghost" color="muted" onClick={() => window.history.forward()}>
        <Icon name="ArrowChevronRight" color="muted" />
      </Button>
    </Box>
  )
}

function TopbarActions() {
  const {state, send: sidepanelSend} = useSidepanel()

  const canSidepanel = state.can('SIDEPANEL_TOGGLE')

  function toggleSidepanel() {
    sidepanelSend({type: 'SIDEPANEL_TOGGLE'}, {to: 'sidepanel', id: 'sidepanel'})
  }

  return (
    <Box
      className={topbarSection()}
      css={{
        background: '$background-alt',
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
          <Button size="1" variant="ghost" color="muted" onClick={toggleSidepanel}>
            <Icon name="Sidepanel" color="muted" />
          </Button>
        </Tooltip>
      )}
      <Settings />
    </Box>
  )
}
