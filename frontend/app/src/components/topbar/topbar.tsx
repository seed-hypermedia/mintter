import { forceSync } from '@app/client/daemon'
import { MINTTER_LINK_PREFIX } from '@app/constants'
import { useLibrary } from '@app/main-page-context'
import { css, styled } from '@app/stitches.config'
import { useRoute } from '@app/utils/use-route'
import { useCreateDraft } from '@components/library/use-create-draft'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { Box } from '../box'
import { Button } from '../button'
import { Icon } from '../icon'
import { Settings } from '../settings'
import { useSidepanel } from '../sidepanel'
import { TextField } from '../text-field'
import { Tooltip } from '../tooltip'

export const TopbarStyled = styled(Box, {
  gridArea: 'topbar',
  width: '$full',
  height: 48,
  display: 'flex',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  background: '$background-alt',
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
  const libraryService = useLibrary()

  const toggle = useCallback(() => libraryService.send('LIBRARY.TOGGLE'), [libraryService])
  return (
    <Box
      data-tauri-drag-region
      className={topbarSection()}
      css={{
        width: 232,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '$5',
        paddingRight: '$3',
      }}
    >
      <span style={{ flex: 1 }} data-tauri-drag-region />
      <Box css={{ display: 'flex', alignItems: 'center', gap: '$4' }}>
        <Button variant="ghost" size="0" color="muted" onClick={toggle}>
          <Icon name="Sidenav" size="2" />
        </Button>
        <TopbarNavigation />
      </Box>
    </Box>
  )
}

function MainBar() {
  const [routeLocation, setRouteLocation] = useLocation()
  let form = useRef(null)
  const [location, setLocation] = useState(() => routeLocation)

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
      data-tauri-drag-region
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
      <Box ref={form} css={{ width: '100%', maxWidth: '800px' }} as="form" onSubmit={handleSubmit}>
        <TextField size={1} name="search" value={location} onChange={(e) => setLocation(e.target.value)} />
      </Box>
    </Box>
  )
}

function TopbarNavigation() {
  return (
    <Box css={{ display: 'flex' }} data-tauri-drag-region>
      <Button size="0" variant="ghost" color="muted" onClick={() => window.history.back()}>
        <Icon name="ArrowChevronLeft" color="muted" />
      </Button>
      <Button size="0" variant="ghost" color="muted" onClick={() => window.history.forward()}>
        <Icon name="ArrowChevronRight" color="muted" />
      </Button>
      <Button size="0" variant="ghost" color="warning" onClick={async () => await forceSync()}>
        sync
      </Button>
    </Box>
  )
}

function TopbarActions() {
  const service = useSidepanel()
  const { match: isDocumentOpen } = useRoute<{ docId: string; version: string }>(['/p/:docId/:version', '/editor/:docId'])
  const { createDraft } = useCreateDraft()

  function toggleSidepanel() {
    service.send('SIDEPANEL.TOGGLE')
  }

  function onCreateDraft() {
    createDraft()
  }
  return (
    <Box
      data-tauri-drag-region
      className={topbarSection()}
      css={{
        flex: 'none',
        paddingLeft: '$7',
        paddingRight: '$4',
        pointerEvents: 'all',
        display: 'flex',
        gap: '$4',
      }}
    >
      {isDocumentOpen && (
        <Tooltip content="Toogle Sidepanel">
          <Button size="0" variant="ghost" color="muted" onClick={toggleSidepanel}>
            <Icon name="Sidepanel" color="muted" />
          </Button>
        </Tooltip>
      )}
      <Button size="0" variant="ghost" color="muted" onClick={onCreateDraft}>
        <Icon name="PencilAdd" color="muted" />
      </Button>
      <Settings />
    </Box>
  )
}
